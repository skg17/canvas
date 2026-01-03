"""Main FastAPI application."""
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
import asyncio
import httpx
import os
from contextlib import asynccontextmanager

from app.config import settings
from app.database import get_db, init_db
from app.models import WatchlistItem
from app.tmdb_client import TMDbClient
from app.jellyfin_client import JellyfinClient
from app.sync import run_periodic_sync
from app.auth import create_access_token, verify_password, get_current_user


async def backfill_genres_on_startup():
    """Backfill genres for existing watchlist items that don't have genres."""
    from app.database import SessionLocal
    tmdb = TMDbClient()
    updated_count = 0
    error_count = 0
    
    try:
        db = SessionLocal()
        try:
            # Get all items without genres
            items = db.query(WatchlistItem).filter(
                (WatchlistItem.genres.is_(None)) | (WatchlistItem.genres == "")
            ).all()
            
            if len(items) == 0:
                print("No items need genre backfilling")
                return
            
            print(f"Backfilling genres for {len(items)} items...")
            
            for item in items:
                try:
                    # Fetch genres from TMDb
                    if item.media_type == "movie":
                        details = await tmdb.get_movie_details(item.tmdb_id)
                    else:
                        details = await tmdb.get_tv_details(item.tmdb_id)
                    
                    genre_list = details.get("genres", [])
                    if genre_list:
                        genre_ids = [str(g.get("id")) for g in genre_list if g.get("id")]
                        item.genres = ",".join(genre_ids) if genre_ids else None
                        updated_count += 1
                        if updated_count % 10 == 0:
                            print(f"Backfilled genres for {updated_count} items...")
                    
                    # Small delay to avoid rate limiting
                    await asyncio.sleep(0.25)
                    
                except Exception as e:
                    error_count += 1
                    print(f"Error fetching genres for {item.title} (ID: {item.tmdb_id}): {e}")
                    continue
            
            db.commit()
            print(f"Genre backfill completed: {updated_count} updated, {error_count} errors, {len(items)} total")
        finally:
            db.close()
    except Exception as e:
        print(f"Error in genre backfill: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await tmdb.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup
    init_db()
    print("Database initialized")
    
    # Run initial sync
    from app.sync import sync_jellyfin_status
    try:
        await sync_jellyfin_status()
        print("Initial sync completed")
    except Exception as e:
        print(f"Initial sync failed: {e}")
    
    # Backfill genres for existing items (non-blocking, runs in background)
    asyncio.create_task(backfill_genres_on_startup())
    
    # Start background sync task
    sync_task = asyncio.create_task(run_periodic_sync(interval_seconds=300))
    
    yield
    
    # Shutdown
    sync_task.cancel()
    try:
        await sync_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.app_title,
    lifespan=lifespan
)

# Trust proxy headers (for reverse proxy)
# This allows the app to work correctly behind nginx/traefik/etc
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Allow all hosts when behind reverse proxy
)

# CORS middleware for React frontend
# Use configured origin if provided, otherwise allow all (for development)
allowed_origins = ["*"]  # Default: allow all
if settings.allowed_origin:
    # Use the configured proxied URL as the allowed origin
    allowed_origins = [settings.allowed_origin]
    print(f"Configured CORS to allow origin: {settings.allowed_origin}")
else:
    print("CORS configured to allow all origins (no ALLOWED_ORIGIN set)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (for built React app in production)
# IMPORTANT: Mount static files BEFORE the catch-all route
# Mount must happen before route definitions to take precedence
import os

# Mount assets directory - this MUST be before the catch-all route
if os.path.exists("frontend/dist/assets"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
    print("Mounted /assets static files directory")
else:
    print("Warning: frontend/dist/assets directory not found")

# Serve other static files from dist root (like vite.svg, favicon, etc.)
# These will be handled by the catch-all route


# Pydantic models for request/response
class WatchlistItemResponse(BaseModel):
    id: int
    title: str
    media_type: str
    tmdb_id: int
    poster_path: Optional[str]
    overview: Optional[str]
    release_date: Optional[str]
    is_available: bool
    is_watched: bool
    queue_order: Optional[int] = None
    jellyfin_item_id: Optional[str]
    genres: Optional[str] = None  # Comma-separated genre IDs
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @classmethod
    def from_orm_item(cls, item: WatchlistItem):
        """Convert SQLAlchemy model to response model."""
        data = {
            "id": item.id,
            "title": item.title,
            "media_type": item.media_type,
            "tmdb_id": item.tmdb_id,
            "poster_path": item.poster_path,
            "overview": item.overview,
            "release_date": item.release_date,
            "is_available": item.is_available,
            "is_watched": item.is_watched,
            "jellyfin_item_id": item.jellyfin_item_id,
            "genres": item.genres,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        }
        return cls(**data)

    class Config:
        from_attributes = True


class AddItemRequest(BaseModel):
    tmdb_id: int
    title: str
    media_type: str
    poster_path: Optional[str] = None
    overview: Optional[str] = None
    release_date: Optional[str] = None


class ReorderQueueRequest(BaseModel):
    item_orders: dict  # {item_id: new_order} - using dict to handle JSON properly


class SearchResult(BaseModel):
    tmdb_id: int
    title: str
    media_type: str
    poster_path: Optional[str]
    overview: Optional[str]
    release_date: Optional[str]
    year: Optional[str]


class LoginRequest(BaseModel):
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Authentication endpoints
@app.post("/api/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Authenticate with password."""
    if not verify_password(login_data.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid password"
        )
    
    access_token = create_access_token()
    return LoginResponse(access_token=access_token)

@app.post("/api/auth/logout")
async def logout():
    """Logout (client should discard token)."""
    return {"message": "Logged out successfully"}

@app.get("/api/auth/check")
async def check_auth(authenticated: bool = Depends(get_current_user)):
    """Check if user is authenticated."""
    return {"authenticated": True}


@app.get("/api/watchlist")
async def get_watchlist(
    media_type: Optional[str] = None,
    watched: Optional[str] = None,
    availability: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = "date_desc",
    genres: Optional[str] = None,  # Comma-separated genre IDs
    authenticated: bool = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get watchlist items with optional filters and sorting."""
    query = db.query(WatchlistItem)
    
    # Apply filters
    if media_type and media_type != "all":
        query = query.filter(WatchlistItem.media_type == media_type)
    
    if watched == "watched":
        query = query.filter(WatchlistItem.is_watched == True)
    elif watched == "unwatched":
        query = query.filter(WatchlistItem.is_watched == False)
    
    if availability == "available":
        query = query.filter(WatchlistItem.is_available == True)
    elif availability == "missing":
        query = query.filter(WatchlistItem.is_available == False)
    
    if search:
        query = query.filter(WatchlistItem.title.ilike(f"%{search}%"))
    
    # Filter by genres (items must have ALL of the selected genres)
    if genres:
        genre_ids = [g.strip() for g in genres.split(",") if g.strip()]
        if genre_ids:
            from sqlalchemy import and_
            # Create conditions for each genre ID - item must have ALL genres
            conditions = []
            for genre_id in genre_ids:
                # Check if genre_id is in the comma-separated genres string
                conditions.append(WatchlistItem.genres.like(f"%{genre_id}%"))
            if conditions:
                query = query.filter(and_(*conditions))
    
    # Apply sorting
    if sort == "date_asc":
        query = query.order_by(WatchlistItem.created_at.asc())
    elif sort == "date_desc":
        query = query.order_by(WatchlistItem.created_at.desc())
    elif sort == "title_asc":
        query = query.order_by(WatchlistItem.title.asc())
    elif sort == "title_desc":
        query = query.order_by(WatchlistItem.title.desc())
    else:
        # Default to newest first
        query = query.order_by(WatchlistItem.created_at.desc())
    
    items = query.all()
    
    return {
        "items": [WatchlistItemResponse.from_orm_item(item).model_dump() for item in items],
        "count": len(items)
    }


@app.get("/api/search")
async def search_media(
    q: str,
    type: Optional[str] = "all"
):
    """Search for media using TMDb."""
    tmdb = TMDbClient()
    
    try:
        if type == "movie":
            results = await tmdb.search_movie(q)
            tv_results = []
        elif type == "tv":
            results = await tmdb.search_tv(q)
            tv_results = []
        else:
            movie_results = await tmdb.search_movie(q)
            tv_results = await tmdb.search_tv(q)
            results = movie_results + tv_results
        
        # Format results
        formatted_results = []
        for item in results[:20]:  # Limit to 20 results
            try:
                media_type = "movie" if "release_date" in item else "tv"
                release_date = item.get("release_date") or item.get("first_air_date", "")
                formatted_results.append({
                    "tmdb_id": item.get("id"),
                    "title": item.get("title") or item.get("name", "Unknown"),
                    "overview": item.get("overview", ""),
                    "poster_path": tmdb.get_poster_url(item.get("poster_path")),
                    "release_date": release_date,
                    "year": release_date[:4] if release_date else None,
                    "media_type": media_type,
                })
            except Exception as e:
                print(f"Error formatting result item: {e}")
                continue
        
        return {"results": formatted_results, "query": q}
    except httpx.HTTPStatusError as e:
        print(f"TMDb API error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"TMDb API error: {e.response.status_code}. Please check your API key."
        )
    except Exception as e:
        print(f"Search error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error searching: {str(e)}")
    finally:
        await tmdb.close()


@app.post("/api/watchlist")
async def add_to_watchlist(
    item: AddItemRequest,
    authenticated: bool = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add item to watchlist."""
    try:
        # Check if already exists
        existing = db.query(WatchlistItem).filter(WatchlistItem.tmdb_id == item.tmdb_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Item already exists in watchlist")
        
        # Check availability in Jellyfin and get item ID
        is_available = False
        is_watched = False
        jellyfin_item_id = None
        genres = None
        
        # Fetch genres from TMDb
        tmdb = TMDbClient()
        try:
            if item.media_type == "movie":
                details = await tmdb.get_movie_details(item.tmdb_id)
            else:
                details = await tmdb.get_tv_details(item.tmdb_id)
            
            genre_list = details.get("genres", [])
            if genre_list:
                genre_ids = [str(g.get("id")) for g in genre_list if g.get("id")]
                genres = ",".join(genre_ids) if genre_ids else None
                print(f"Fetched genres for {item.title}: {genres}")
        except Exception as e:
            print(f"Error fetching genres from TMDb: {e}")
            # Continue without genres if fetch fails
        finally:
            await tmdb.close()
        
        jellyfin = JellyfinClient()
        try:
            print(f"Checking availability for: {item.title} (TMDb ID: {item.tmdb_id}, Type: {item.media_type})")
            jellyfin_item = await jellyfin.find_item_by_tmdb_id(item.tmdb_id, item.media_type, title=item.title)
            if jellyfin_item:
                is_available = True
                jellyfin_item_id = jellyfin_item.get("Id")
                print(f"Availability check result: {is_available}, Jellyfin Item ID: {jellyfin_item_id}")
                print(f"Checking watched status for: {item.title}")
                is_watched = await jellyfin.is_watched(item.tmdb_id, item.media_type, title=item.title)
                print(f"Watched status result: {is_watched}")
            else:
                print(f"Availability check result: {is_available}")
        except httpx.HTTPStatusError as e:
            print(f"Jellyfin API error when checking availability: {e.response.status_code} - {e.response.text}")
            # Continue with default values if Jellyfin check fails
        except Exception as e:
            print(f"Error checking Jellyfin availability: {e}")
            import traceback
            traceback.print_exc()
            # Continue with default values if Jellyfin check fails
        finally:
            await jellyfin.close()
        
        # Create new item
        db_item = WatchlistItem(
            tmdb_id=item.tmdb_id,
            title=item.title,
            media_type=item.media_type,
            poster_path=item.poster_path or None,
            overview=item.overview or None,
            release_date=item.release_date or None,
            is_available=is_available,
            is_watched=is_watched,
            jellyfin_item_id=jellyfin_item_id,
            genres=genres
        )
        
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        return WatchlistItemResponse.from_orm_item(db_item).model_dump()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding to watchlist: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding item: {str(e)}")


@app.post("/api/watchlist/backfill-genres")
async def backfill_genres(
    authenticated: bool = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Backfill genres for existing watchlist items that don't have genres."""
    tmdb = TMDbClient()
    updated_count = 0
    error_count = 0
    
    try:
        # Get all items without genres
        items = db.query(WatchlistItem).filter(
            (WatchlistItem.genres.is_(None)) | (WatchlistItem.genres == "")
        ).all()
        
        print(f"Found {len(items)} items to backfill genres for")
        
        for item in items:
            try:
                # Fetch genres from TMDb
                if item.media_type == "movie":
                    details = await tmdb.get_movie_details(item.tmdb_id)
                else:
                    details = await tmdb.get_tv_details(item.tmdb_id)
                
                genre_list = details.get("genres", [])
                if genre_list:
                    genre_ids = [str(g.get("id")) for g in genre_list if g.get("id")]
                    item.genres = ",".join(genre_ids) if genre_ids else None
                    updated_count += 1
                    print(f"Updated genres for {item.title}: {item.genres}")
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.25)
                
            except Exception as e:
                error_count += 1
                print(f"Error fetching genres for {item.title} (ID: {item.tmdb_id}): {e}")
                continue
        
        db.commit()
        return {
            "updated": updated_count,
            "errors": error_count,
            "total": len(items)
        }
    except Exception as e:
        db.rollback()
        print(f"Error in backfill: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error backfilling genres: {str(e)}")
    finally:
        await tmdb.close()


@app.get("/api/genres")
async def get_genres(
    media_type: Optional[str] = "all",
    authenticated: bool = Depends(get_current_user)
):
    """Get list of all genres from TMDb."""
    tmdb = TMDbClient()
    try:
        genres = []
        if media_type == "all" or media_type == "movie":
            movie_genres = await tmdb.get_genre_list("movie")
            genres.extend(movie_genres)
        if media_type == "all" or media_type == "tv":
            tv_genres = await tmdb.get_genre_list("tv")
            # Merge TV genres, avoiding duplicates
            existing_ids = {g["id"] for g in genres}
            for tv_genre in tv_genres:
                if tv_genre["id"] not in existing_ids:
                    genres.append(tv_genre)
        
        # Sort by name
        genres.sort(key=lambda x: x.get("name", ""))
        return {"genres": genres}
    except Exception as e:
        print(f"Error fetching genres: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching genres: {str(e)}")
    finally:
        await tmdb.close()


@app.delete("/api/watchlist/{item_id}")
async def remove_from_watchlist(
    item_id: int,
    authenticated: bool = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove item from watchlist."""
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    
    return {"message": "Item removed successfully"}


@app.post("/api/watchlist/{item_id}/toggle-watched")
async def toggle_watched_status(
    item_id: int,
    authenticated: bool = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle watched status for an item."""
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.is_watched = not item.is_watched
    item.watched_manually_set = True  # Mark as manually set
    db.commit()
    db.refresh(item)
    
    return WatchlistItemResponse.from_orm_item(item).model_dump()


@app.get("/api/config")
async def get_config():
    """Get frontend configuration."""
    return {
        "jellyseerr_base_url": settings.jellyseerr_base_url,
        "jellyfin_base_url": settings.jellyfin_base_url.rstrip("/")
    }


@app.post("/api/watchlist/{item_id}/add-to-queue")
async def add_to_queue(
    item_id: int,
    db: Session = Depends(get_db)
):
    """Add item to queue."""
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # If already in queue, do nothing
    if item.queue_order is not None:
        return WatchlistItemResponse.from_orm_item(item).model_dump()
    
    # Get the highest queue order
    max_order = db.query(func.max(WatchlistItem.queue_order)).scalar()
    item.queue_order = (max_order or 0) + 1
    db.commit()
    db.refresh(item)
    
    return WatchlistItemResponse.from_orm_item(item).model_dump()


@app.post("/api/watchlist/{item_id}/remove-from-queue")
async def remove_from_queue(
    item_id: int,
    authenticated: bool = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove item from queue."""
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.queue_order is None:
        return WatchlistItemResponse.from_orm_item(item).model_dump()
    
    old_order = item.queue_order
    item.queue_order = None
    db.commit()
    
    # Reorder remaining items
    items_to_reorder = db.query(WatchlistItem).filter(
        WatchlistItem.queue_order > old_order
    ).all()
    for item_to_reorder in items_to_reorder:
        item_to_reorder.queue_order -= 1
    db.commit()
    
    db.refresh(item)
    return WatchlistItemResponse.from_orm_item(item).model_dump()


@app.post("/api/watchlist/reorder-queue")
async def reorder_queue(
    request: ReorderQueueRequest,
    authenticated: bool = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reorder queue items."""
    try:
        for item_id, new_order in request.item_orders.items():
            item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
            if item:
                item.queue_order = new_order
        
        db.commit()
        return {"message": "Queue reordered successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error reordering queue: {str(e)}")


@app.get("/api/watchlist/queue")
async def get_queue(
    authenticated: bool = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all items in queue, ordered by queue_order."""
    items = db.query(WatchlistItem).filter(
        WatchlistItem.queue_order.isnot(None)
    ).order_by(WatchlistItem.queue_order.asc()).all()
    
    return {
        "items": [WatchlistItemResponse.from_orm_item(item).model_dump() for item in items],
        "count": len(items)
    }


# Serve React app for all non-API routes (for production)
# This must be LAST to catch all remaining routes
# Note: /assets/* requests should be handled by the mount above, but if they reach here, return 404
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str, request: Request):
    """Serve React app for all non-API routes."""
    # Block API routes (shouldn't reach here, but safety check)
    if full_path.startswith("api"):
        raise HTTPException(status_code=404)
    
    # Don't serve assets here - they're handled by the /assets mount above
    # If we reach here for an asset request, the mount failed, so return 404
    if full_path.startswith("assets"):
        print(f"Warning: Asset request '{full_path}' reached catch-all route - mount may have failed")
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Normalize path (remove leading slash if present)
    path = full_path.lstrip("/")
    
    # Serve other static files from dist root if they exist (like vite.svg, favicon, etc.)
    if path:
        dist_path = os.path.join("frontend/dist", path)
        if os.path.exists(dist_path) and os.path.isfile(dist_path):
            # Determine content type
            if path.endswith(".svg"):
                return FileResponse(dist_path, media_type="image/svg+xml")
            elif path.endswith(".ico"):
                return FileResponse(dist_path, media_type="image/x-icon")
            elif path.endswith(".png"):
                return FileResponse(dist_path, media_type="image/png")
            else:
                return FileResponse(dist_path)
    
    # For all other routes (including root), serve index.html (SPA routing)
    react_index = "frontend/dist/index.html"
    if os.path.exists(react_index):
        response = FileResponse(react_index, media_type="text/html")
        # Add headers to prevent caching of index.html (so updates are reflected)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    # Fallback for development
    return {"message": "React app not built. Run 'npm run build' in the frontend directory."}
