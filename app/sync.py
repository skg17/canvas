"""Background sync task for Jellyfin status."""
import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import WatchlistItem
from app.jellyfin_client import JellyfinClient


async def sync_jellyfin_status():
    """Sync availability and watched status from Jellyfin."""
    db: Session = SessionLocal()
    jellyfin = JellyfinClient()
    
    try:
        items = db.query(WatchlistItem).all()
        
        for item in items:
            try:
                # Check availability and get Jellyfin item ID (pass title for fallback matching)
                jellyfin_item = await jellyfin.find_item_by_tmdb_id(item.tmdb_id, item.media_type, title=item.title)
                if jellyfin_item:
                    item.is_available = True
                    item.jellyfin_item_id = jellyfin_item.get("Id")
                    # Only update watched status if it wasn't manually set by the user
                    if not item.watched_manually_set:
                        is_watched = await jellyfin.is_watched(item.tmdb_id, item.media_type, title=item.title)
                        item.is_watched = is_watched
                else:
                    item.is_available = False
                    # Only update watched status if it wasn't manually set by the user
                    if not item.watched_manually_set:
                        item.is_watched = False
                    item.jellyfin_item_id = None
                
            except Exception as e:
                print(f"Error syncing item {item.id}: {e}")
                continue
        
        db.commit()
    except Exception as e:
        print(f"Error in sync task: {e}")
        db.rollback()
    finally:
        db.close()
        await jellyfin.close()


async def run_periodic_sync(interval_seconds: int = 300):
    """Run sync task periodically."""
    while True:
        try:
            await sync_jellyfin_status()
            print(f"Sync completed. Next sync in {interval_seconds} seconds.")
        except Exception as e:
            print(f"Error in periodic sync: {e}")
        
        await asyncio.sleep(interval_seconds)

