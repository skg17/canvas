"""TMDb API client."""
import asyncio
import httpx
from typing import List, Dict, Optional
from app.config import settings


class TMDbClient:
    """Client for TMDb API."""
    
    BASE_URL = "https://api.themoviedb.org/3"
    
    def __init__(self):
        self.api_key = settings.tmdb_api_key
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            params={"api_key": self.api_key},
            timeout=10.0
        )
    
    async def search_movie(self, query: str) -> List[Dict]:
        """Search for movies."""
        response = await self.client.get(
            "/search/movie",
            params={"query": query}
        )
        response.raise_for_status()
        return response.json().get("results", [])
    
    async def search_tv(self, query: str) -> List[Dict]:
        """Search for TV shows."""
        response = await self.client.get(
            "/search/tv",
            params={"query": query}
        )
        response.raise_for_status()
        return response.json().get("results", [])
    
    async def search_all(self, query: str) -> Dict[str, List[Dict]]:
        """Search both movies and TV shows."""
        movie_results, tv_results = await asyncio.gather(
            self.search_movie(query),
            self.search_tv(query)
        )
        return {
            "movies": movie_results,
            "tv": tv_results
        }
    
    def get_poster_url(self, poster_path: Optional[str], size: str = "w500") -> Optional[str]:
        """Get full poster URL."""
        if not poster_path:
            return None
        return f"https://image.tmdb.org/t/p/{size}{poster_path}"
    
    async def get_movie_details(self, movie_id: int) -> Dict:
        """Get movie details including genres."""
        response = await self.client.get(f"/movie/{movie_id}")
        response.raise_for_status()
        return response.json()
    
    async def get_tv_details(self, tv_id: int) -> Dict:
        """Get TV show details including genres."""
        response = await self.client.get(f"/tv/{tv_id}")
        response.raise_for_status()
        return response.json()
    
    async def get_genre_list(self, media_type: str = "movie") -> List[Dict]:
        """Get list of all genres for movies or TV shows."""
        endpoint = "/genre/movie/list" if media_type == "movie" else "/genre/tv/list"
        response = await self.client.get(endpoint)
        response.raise_for_status()
        return response.json().get("genres", [])
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

