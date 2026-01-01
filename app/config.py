"""Configuration management for canvas."""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables."""
    
    # Jellyfin
    jellyfin_base_url: str
    jellyfin_api_key: str
    jellyfin_username: Optional[str] = None  # Optional: specify which user to check watched status for
    
    # Jellyseerr
    jellyseerr_base_url: str
    
    # TMDb
    tmdb_api_key: str
    
    # Database
    database_url: str = "sqlite:///./watchlist.db"
    
    # App
    app_title: str = "canvas"
    debug: bool = False
    
    # Reverse Proxy
    allowed_origin: Optional[str] = None  # Optional: specify the proxied URL (e.g., https://canvas.example.com)
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

