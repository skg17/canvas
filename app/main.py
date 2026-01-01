"""Main FastAPI application."""
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session
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
    lifespan=lifespan,
    root_path=""  # Set to empty string - let reverse proxy handle paths
)

# Trust proxy headers (for reverse proxy)
# This allows the app to work correctly behind nginx/traefik/etc
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Allow all hosts when behind reverse proxy
)

# CORS middleware for React frontend
# In production, allow all origins since we don't know the server IP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (for built React app in production)
# Vite builds assets to /assets/, so mount the assets directory
try:
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
except Exception:
    pass  # Directory might not exist in dev mode

# Serve other static files from dist root (like vite.svg, favicon, etc.)
try:
    # Mount individual files that might be in dist root
    import os
    if os.path.exists("frontend/dist"):
        # We'll serve these via the catch-all route instead
        pass
except Exception:
    pass


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
    jellyfin_item_id: Optional[str]
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


class SearchResult(BaseModel):
    tmdb_id: int
    title: str
    media_type: str
    poster_path: Optional[str]
    overview: Optional[str]
    release_date: Optional[str]
    year: Optional[str]


@app.get("/api/watchlist")
async def get_watchlist(
    media_type: Optional[str] = None,
    watched: Optional[str] = None,
    availability: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get watchlist items with optional filters."""
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
    
    items = query.order_by(WatchlistItem.created_at.desc()).all()
    
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
            jellyfin_item_id=jellyfin_item_id
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


@app.delete("/api/watchlist/{item_id}")
async def remove_from_watchlist(
    item_id: int,
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
    db: Session = Depends(get_db)
):
    """Toggle watched status for an item."""
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.is_watched = not item.is_watched
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


# Serve React app for all non-API routes (for production)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str, request: Request):
    """Serve React app for all non-API routes."""
    # Block API routes
    if full_path.startswith("api"):
        raise HTTPException(status_code=404)
    
    # Normalize path (remove leading slash if present)
    path = full_path.lstrip("/")
    
    # Serve static assets if they exist
    if path:
        dist_path = os.path.join("frontend/dist", path)
        if os.path.exists(dist_path) and os.path.isfile(dist_path):
            return FileResponse(dist_path)
    
    # For all other routes (including root), serve index.html (SPA routing)
    react_index = "frontend/dist/index.html"
    if os.path.exists(react_index):
        return FileResponse(react_index, media_type="text/html")
    
    # Fallback for development
    return {"message": "React app not built. Run 'npm run build' in the frontend directory."}
