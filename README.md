# canvas

A lightweight, self-hosted web application that acts as the canonical shared watchlist for a Jellyfin + Jellyseerr media ecosystem.

## Features

- **Shared Watchlist**: Maintain a single watchlist for movies and TV shows
- **TMDb Integration**: Search and add media using TMDb metadata
- **Jellyfin Sync**: Automatically detect availability and watched status from Jellyfin
- **Jellyseerr Integration**: One-click redirect to request missing content
- **Clean Dashboard**: View all watchlist items with filters and status indicators

## Requirements

- Python 3.11+
- Docker and Docker Compose (recommended)
- TMDb API key ([Get one here](https://www.themoviedb.org/settings/api))
- Jellyfin instance with API access
- Jellyseerr instance (for request links)

## Quick Start

1. **Clone and configure**:
   ```bash
   # Create .env file with your API keys and URLs
   # See Configuration section below for required variables
   ```

2. **Run with Docker** (Production):
   ```bash
   docker-compose build
   docker-compose up -d
   ```
   The Docker build will automatically build the React frontend and serve it with the FastAPI backend.

3. **Access the app**:
   Open http://localhost:8000 in your browser

### Development Setup

For frontend development, you can run React separately:

1. **Backend** (in one terminal):
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Frontend** (in another terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend will run on http://localhost:3000 with hot-reload

## Development Workflow

### Option 1: Development Mode (Hot Reload)
Use `docker-compose.dev.yml` which mounts your code directory and enables auto-reload:
```bash
docker-compose -f docker-compose.dev.yml up -d
```
**Changes to code are reflected immediately** - no rebuild needed!

### Option 2: Production Mode (Rebuild Required)
Use regular `docker-compose.yml`:
```bash
# After making code changes:
docker-compose up -d --build
# Or:
docker-compose build && docker-compose up -d
```
**You must rebuild the image** for code changes to take effect.

**Important for data persistence:**
- Use `docker-compose restart` to restart without rebuilding (preserves data)
- Use `docker-compose up -d --build` to rebuild (data still persists via volume)
- **NEVER use `docker-compose down -v`** - the `-v` flag removes volumes and deletes your database
- Use `docker-compose down` (without `-v`) if you need to stop and remove containers

## Configuration

Edit `.env` file with your settings:

```env
JELLYFIN_BASE_URL=http://jellyfin:8096
JELLYFIN_API_KEY=your_jellyfin_api_key_here
JELLYFIN_USERNAME=sahil  # Optional: specify which user to check watched status for
JELLYSEERR_BASE_URL=http://jellyseerr:5055
TMDB_API_KEY=your_tmdb_api_key_here
```

### Getting API Keys

- **Jellyfin API Key**: 
  1. Log into Jellyfin
  2. Go to Dashboard → API Keys
  3. Create a new API key

- **TMDb API Key**: 
  1. Sign up at [themoviedb.org](https://www.themoviedb.org)
  2. Go to Settings → API
  3. Request an API key

## Development

### Local Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables**:
   ```bash
   export JELLYFIN_BASE_URL="http://localhost:8096"
   export JELLYFIN_API_KEY="your_key"
   export JELLYSEERR_BASE_URL="http://localhost:5055"
   export TMDB_API_KEY="your_key"
   ```

3. **Run the application**:
   ```bash
   uvicorn app.main:app --reload
   ```

## Usage

1. **Add Media**: Click "+ Add Media" and search for movies or TV shows
2. **View Status**: See availability and watched status on each card
3. **Request Content**: Click "Request in Jellyseerr" for missing items (redirects to Jellyseerr media page)
4. **Filter**: Use the filter bar to view by type, status, or availability
5. **Sync**: Status syncs automatically every 5 minutes on startup and periodically, or manually via `/sync`

## Jellyseerr URL Format

The app redirects to Jellyseerr using the format: `{JELLYSEERR_BASE_URL}/{media_type}/{tmdb_id}`

For example:
- Movies: `http://jellyseerr:5055/movie/12345`
- TV Shows: `http://jellyseerr:5055/tv/67890`

If your Jellyseerr uses a different URL structure, you may need to adjust the URL format in the React components.

## Architecture

- **Backend**: FastAPI with SQLAlchemy ORM (REST API)
- **Database**: SQLite (MVP)
- **Frontend**: React 18 with Vite, Tailwind CSS
- **APIs**: TMDb (search), Jellyfin (availability/watched), Jellyseerr (redirects)

## Data Persistence

The database is stored in the `data/` directory (mounted as a volume in Docker). The app automatically creates the database and tables on first startup.

**Important:** To preserve your data when updating:
- The `data/` directory is mounted as a volume, so your database persists across container restarts
- **Never use `docker-compose down -v`** as this will delete the volume and all your data
- Use `docker-compose down` and `docker-compose up` to restart without losing data
- The database file is located at `./data/watchlist.db` on your host machine

## License

MIT

