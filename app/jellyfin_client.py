"""Jellyfin API client."""
import httpx
from typing import List, Dict, Optional
from app.config import settings


class JellyfinClient:
    """Client for Jellyfin API."""
    
    def __init__(self):
        self.base_url = settings.jellyfin_base_url.rstrip("/")
        self.api_key = settings.jellyfin_api_key
        self.preferred_username = getattr(settings, 'jellyfin_username', None)
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "X-Emby-Token": self.api_key,
                "Content-Type": "application/json"
            },
            timeout=10.0
        )
        self._user_id = None
    
    async def get_user_id(self, preferred_username: Optional[str] = None) -> Optional[str]:
        """Get user ID, optionally preferring a specific username."""
        # Use instance preferred username if not specified
        if preferred_username is None:
            preferred_username = self.preferred_username
        
        if self._user_id and not preferred_username:
            return self._user_id
        
        try:
            response = await self.client.get("/Users")
            response.raise_for_status()
            users = response.json()
            if users and len(users) > 0:
                # If preferred username is specified, try to find it
                if preferred_username:
                    for user in users:
                        if user.get("Name", "").lower() == preferred_username.lower():
                            self._user_id = user.get("Id")
                            print(f"Using preferred Jellyfin user: {user.get('Name')} (ID: {self._user_id})")
                            return self._user_id
                    print(f"Warning: Preferred user '{preferred_username}' not found. Available users: {[u.get('Name') for u in users]}")
                
                # Otherwise use first user
                self._user_id = users[0].get("Id")
                user_name = users[0].get("Name", "Unknown")
                print(f"Using Jellyfin user: {user_name} (ID: {self._user_id})")
                if len(users) > 1:
                    print(f"Available users: {[u.get('Name') for u in users]}")
                return self._user_id
        except Exception as e:
            print(f"Error getting user ID: {e}")
            import traceback
            traceback.print_exc()
        return None
    
    async def get_library_items(self, library_id: Optional[str] = None) -> List[Dict]:
        """Get all library items from a specific library or all libraries."""
        all_items = []
        try:
            # Force refresh user ID to ensure preferred username is used
            if self.preferred_username:
                self._user_id = None  # Reset to force lookup
            user_id = await self.get_user_id()
            
            # Query all items recursively across all libraries with pagination
            # Include UserId to get UserData (watched status) in the response
            params = {
                "Recursive": "true",
                "IncludeItemTypes": "Movie,Series"
            }
            if user_id:
                params["UserId"] = user_id
                # Request UserData to be included in response
                params["Fields"] = "ProviderIds,UserData"
            
            # Use pagination to get all items
            start_index = 0
            limit = 200  # Jellyfin supports up to 200 items per page
            total_fetched = 0
            
            while True:
                params["StartIndex"] = start_index
                params["Limit"] = limit
                
                response = await self.client.get("/Items", params=params)
                response.raise_for_status()
                data = response.json()
                items = data.get("Items", [])
                total_count = data.get("TotalRecordCount", 0)
                
                all_items.extend(items)
                total_fetched += len(items)
                
                # Break if we've fetched all items or got no items
                if total_fetched >= total_count or len(items) == 0:
                    break
                
                start_index += limit
            
            print(f"Fetched {len(all_items)} items across all libraries (total: {total_count})")
        
        except Exception as e:
            print(f"Error getting library items: {e}")
            import traceback
            traceback.print_exc()
        
        return all_items
    
    async def find_item_by_tmdb_id(self, tmdb_id: int, media_type: str, title: Optional[str] = None) -> Optional[Dict]:
        """Find a library item by TMDb ID across all libraries, with title fallback."""
        # Jellyfin stores TMDb ID in ProviderIds
        items = await self.get_library_items()
        
        # Convert tmdb_id to both string and int for matching
        tmdb_id_str = str(tmdb_id)
        tmdb_id_int = tmdb_id
        
        # Debug: check a few items to see what ProviderIds look like
        debug_checked = 0
        debug_with_tmdb = 0
        matching_items_by_title = []
        
        for item in items:
            provider_ids = item.get("ProviderIds", {})
            item_type = item.get("Type", "").lower()
            item_name = item.get("Name", "Unknown")
            
            # Only check items of the correct type
            if not ((media_type == "movie" and item_type == "movie") or \
                   (media_type == "tv" and item_type == "series")):
                continue
            
            debug_checked += 1
            
            # Check TMDb ID in various formats
            # Jellyfin might store it as "Tmdb", "TheMovieDb", or "tmdb"
            provider_tmdb = None
            for key in ["Tmdb", "TheMovieDb", "tmdb", "TMDB"]:
                if key in provider_ids:
                    provider_tmdb = provider_ids[key]
                    break
            
            if provider_tmdb:
                debug_with_tmdb += 1
                # Handle both string and int formats
                try:
                    if str(provider_tmdb) == tmdb_id_str or int(provider_tmdb) == tmdb_id_int:
                        print(f"Found {media_type} '{item_name}' with TMDb ID {tmdb_id} in library")
                        return item
                except (ValueError, TypeError):
                    continue
            
            # Fallback: match by title if TMDb ID not available
            if title and item_name:
                # Normalize titles for comparison (lowercase, remove extra spaces)
                normalized_title = title.lower().strip()
                normalized_item_name = item_name.lower().strip()
                
                # Exact match
                if normalized_title == normalized_item_name:
                    matching_items_by_title.append(item)
                # Partial match (title contains item name or vice versa)
                elif normalized_title in normalized_item_name or normalized_item_name in normalized_title:
                    matching_items_by_title.append(item)
            
            # Debug: log first few items to see structure
            if debug_checked <= 3:
                print(f"Debug: Item '{item_name}' ({item_type}) - ProviderIds: {provider_ids}")
        
        # If no TMDb ID match but we have title matches, use the best one
        if matching_items_by_title and not debug_with_tmdb:
            # Prefer exact matches
            exact_matches = [item for item in matching_items_by_title 
                           if item.get("Name", "").lower().strip() == title.lower().strip()]
            if exact_matches:
                matched_item = exact_matches[0]
                print(f"Found {media_type} '{matched_item.get('Name')}' by title match (TMDb ID not in ProviderIds)")
                return matched_item
            elif matching_items_by_title:
                matched_item = matching_items_by_title[0]
                print(f"Found {media_type} '{matched_item.get('Name')}' by partial title match (TMDb ID not in ProviderIds)")
                return matched_item
        
        print(f"Item with TMDb ID {tmdb_id} ({media_type}) not found in any library")
        print(f"Debug: Checked {debug_checked} {media_type} items, {debug_with_tmdb} had TMDb IDs")
        if title:
            print(f"Debug: Found {len(matching_items_by_title)} potential title matches")
        
        return None
    
    async def is_available(self, tmdb_id: int, media_type: str, title: Optional[str] = None) -> bool:
        """Check if media is available in Jellyfin."""
        item = await self.find_item_by_tmdb_id(tmdb_id, media_type, title)
        return item is not None
    
    async def is_watched(self, tmdb_id: int, media_type: str, title: Optional[str] = None) -> bool:
        """Check if media is watched in Jellyfin."""
        print(f"is_watched called for: {title} (TMDb ID: {tmdb_id}, Type: {media_type})")
        item = await self.find_item_by_tmdb_id(tmdb_id, media_type, title)
        if not item:
            print(f"Item not found for watched check: {title}")
            return False
        
        item_id = item.get("Id")
        if not item_id:
            print(f"No item ID found for: {title}")
            return False
        
        print(f"Checking watched status for item ID: {item_id}, Name: {item.get('Name', 'Unknown')}")
        
        user_id = await self.get_user_id()
        if not user_id:
            # Try to get UserData from the item we already have
            user_data = item.get("UserData", {})
            if user_data:
                if media_type == "movie":
                    return user_data.get("Played", False)
                # For TV, check if series is marked as played
                return user_data.get("Played", False)
            print("Warning: No user ID and no UserData in item")
            return False
        
        # Re-fetch the item with UserId to ensure UserData is populated
        print(f"Fetching UserData for item ID {item_id} with user ID {user_id}")
        try:
            item_response = await self.client.get(
                f"/Items/{item_id}",
                params={"UserId": user_id, "Fields": "UserData"}
            )
            print(f"Item fetch response status: {item_response.status_code}")
            if item_response.status_code == 200:
                item_with_userdata = item_response.json()
                user_data = item_with_userdata.get("UserData", {})
                # Also check for LastPlayedDate in the item itself
                last_played = item_with_userdata.get("UserData", {}).get("LastPlayedDate")
                print(f"Debug: Fetched item '{item.get('Name', 'Unknown')}' - UserData: {user_data}")
                if last_played:
                    print(f"Debug: LastPlayedDate: {last_played}")
                
                # Also check playback history/activity
                try:
                    # Check if there's any playback history for this item
                    history_response = await self.client.get(
                        f"/Users/{user_id}/Items/{item_id}/PlaybackInfo",
                        params={}
                    )
                    if history_response.status_code == 200:
                        playback_info = history_response.json()
                        print(f"Debug: PlaybackInfo: {playback_info}")
                    
                    # Also try to get activity log for this item
                    activity_response = await self.client.get(
                        f"/Users/{user_id}/Items/{item_id}/UserData",
                        params={}
                    )
                    if activity_response.status_code == 200:
                        activity_data = activity_response.json()
                        print(f"Debug: UserData endpoint: {activity_data}")
                except Exception as e:
                    print(f"Debug: Could not fetch playback info: {e}")
            else:
                # Fallback to UserData from original item
                user_data = item.get("UserData", {})
                print(f"Debug: Item fetch returned {item_response.status_code}, using original UserData: {user_data}")
                if not user_data:
                    print(f"Warning: No UserData found in original item either")
        except Exception as e:
            print(f"Error fetching item with UserData: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to UserData from original item
            user_data = item.get("UserData", {})
            print(f"Debug: Using original UserData from item: {user_data}")
        
        if media_type == "movie":
            # For movies, check UserData.Played
            played = user_data.get("Played", False)
            played_percentage = user_data.get("PlayedPercentage", 0)
            play_count = user_data.get("PlayCount", 0)
            last_played_date = user_data.get("LastPlayedDate")
            
            print(f"Debug: Movie '{item.get('Name', 'Unknown')}' - Played: {played}, PlayCount: {play_count}, PlayedPercentage: {played_percentage}, LastPlayedDate: {last_played_date}")
            
            # Consider it watched if:
            # 1. Played is True, OR
            # 2. There's a play count > 0, OR
            # 3. PlayedPercentage is 100% (fully watched), OR
            # 4. There's a LastPlayedDate (indicates it was played at some point)
            is_watched = played or play_count > 0 or played_percentage >= 100 or (last_played_date is not None)
            
            if is_watched:
                print(f"Movie '{item.get('Name', 'Unknown')}' is marked as watched (Played={played}, PlayCount={play_count})")
            else:
                print(f"Movie '{item.get('Name', 'Unknown')}' is NOT watched")
            
            return is_watched
        else:
            # For TV shows, check if all episodes are watched
            series_id = item_id
            
            # First check if the series itself is marked as played
            if user_data.get("Played", False):
                print(f"TV series '{item.get('Name', 'Unknown')}' is marked as fully watched")
                return True
            
            # Get all episodes for the series
            try:
                episodes_response = await self.client.get(
                    f"/Shows/{series_id}/Episodes",
                    params={"UserId": user_id}
                )
                if episodes_response.status_code != 200:
                    # Fallback: if we can't get episodes, use series UserData
                    return user_data.get("Played", False)
                
                episodes = episodes_response.json().get("Items", [])
                if not episodes:
                    # No episodes found, check series UserData
                    return user_data.get("Played", False)
                
                # Check if all episodes are played
                total_episodes = len(episodes)
                played_episodes = 0
                for episode in episodes:
                    episode_user_data = episode.get("UserData", {})
                    if episode_user_data.get("Played", False):
                        played_episodes += 1
                
                all_watched = played_episodes == total_episodes and total_episodes > 0
                if all_watched:
                    print(f"TV series '{item.get('Name', 'Unknown')}' has all {total_episodes} episodes watched")
                return all_watched
            except Exception as e:
                print(f"Error checking TV episodes: {e}")
                import traceback
                traceback.print_exc()
                # Fallback: check series UserData
                return user_data.get("Played", False)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

