"""Database models."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class WatchlistItem(Base):
    """Watchlist item model."""
    __tablename__ = "watchlist_items"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    media_type = Column(String, nullable=False)  # "movie" or "tv"
    tmdb_id = Column(Integer, nullable=False, unique=True, index=True)
    poster_path = Column(String, nullable=True)
    overview = Column(String, nullable=True)
    release_date = Column(String, nullable=True)  # Store as string for simplicity
    is_available = Column(Boolean, default=False, index=True)
    is_watched = Column(Boolean, default=False, index=True)
    watched_manually_set = Column(Boolean, default=False)  # Track if user manually set watched status
    queue_order = Column(Integer, nullable=True, index=True)  # Position in queue (null = not in queue)
    jellyfin_item_id = Column(String, nullable=True)  # Store Jellyfin item ID for direct linking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

