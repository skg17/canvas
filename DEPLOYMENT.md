# Deployment Guide

This guide covers how to package and deploy canvas to your home server.

## Option 1: Build and Transfer Docker Image (Recommended)

This method packages everything into a single Docker image that can be transferred to your server.

### Step 1: Build the Docker Image

On your development machine:

```bash
# Build the image with a tag
docker build -t canvas:latest .

# Verify the image was created
docker images | grep canvas
```

### Step 2: Save the Image to a File

```bash
# Save the image to a tar file
docker save canvas:latest | gzip > canvas-latest.tar.gz

# Check the file size (it will be large, typically 500MB-1GB)
ls -lh canvas-latest.tar.gz
```

### Step 3: Transfer to Your Home Server

Transfer the file to your server using one of these methods:

**Using SCP:**
```bash
scp canvas-latest.tar.gz user@your-server-ip:/path/to/destination/
```

**Using rsync:**
```bash
rsync -avz canvas-latest.tar.gz user@your-server-ip:/path/to/destination/
```

**Using a USB drive or network share:**
Copy the file manually to your server.

### Step 4: Load and Run on Your Server

On your home server:

```bash
# Load the image
gunzip -c canvas-latest.tar.gz | docker load

# Verify it loaded
docker images | grep canvas

# Create a directory for the app
mkdir -p ~/canvas
cd ~/canvas

# Create docker-compose.yml (see below)
# Create .env file with your configuration (see below)

# Start the container
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Step 5: Create docker-compose.yml on Server

Create `~/canvas/docker-compose.yml`:

```yaml
version: '3.8'

services:
  canvas:
    image: canvas:latest
    container_name: canvas
    ports:
      - "8000:8000"
    environment:
      - JELLYFIN_BASE_URL=${JELLYFIN_BASE_URL}
      - JELLYFIN_API_KEY=${JELLYFIN_API_KEY}
      - JELLYFIN_USERNAME=${JELLYFIN_USERNAME:-}
      - JELLYSEERR_BASE_URL=${JELLYSEERR_BASE_URL}
      - TMDB_API_KEY=${TMDB_API_KEY}
      - DATABASE_URL=sqlite:////data/watchlist.db
    volumes:
      - ./data:/data:rw
    restart: unless-stopped
```

### Step 6: Create .env File on Server

Create `~/canvas/.env`:

```env
JELLYFIN_BASE_URL=http://jellyfin:8096
JELLYFIN_API_KEY=your_jellyfin_api_key_here
JELLYFIN_USERNAME=sahil
JELLYSEERR_BASE_URL=http://jellyseerr:5055
TMDB_API_KEY=your_tmdb_api_key_here
```

**Important:** Adjust the URLs based on your network setup:
- If Jellyfin/Jellyseerr are on the same Docker network, use service names (e.g., `http://jellyfin:8096`)
- If they're on the host network, use `http://localhost:8096` or `http://192.168.1.x:8096`
- If they're on different machines, use their IP addresses

## Option 2: Git Clone and Build on Server

If your server has internet access and can build Docker images:

### Step 1: Clone Repository on Server

```bash
# On your server
cd ~
git clone <your-repo-url> canvas
cd canvas
```

### Step 2: Create .env File

```bash
# Create .env file with your configuration
nano .env
```

### Step 3: Build and Run

```bash
# Build and start
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Option 3: Docker Registry (Advanced)

If you have a private Docker registry or want to use Docker Hub:

### Step 1: Tag and Push to Registry

```bash
# Tag for your registry
docker tag canvas:latest your-registry.com/canvas:latest

# Or for Docker Hub
docker tag canvas:latest yourusername/canvas:latest

# Push
docker push your-registry.com/canvas:latest
```

### Step 2: Pull and Run on Server

On your server, update `docker-compose.yml` to use the registry image:

```yaml
services:
  canvas:
    image: your-registry.com/canvas:latest
    # ... rest of config
```

Then:
```bash
docker-compose pull
docker-compose up -d
```

## Network Configuration

### Same Docker Network (Recommended)

If Jellyfin and Jellyseerr are running in Docker on the same server:

1. Create a shared network:
   ```bash
   docker network create media-network
   ```

2. Update all docker-compose.yml files to use this network:
   ```yaml
   services:
     canvas:
       # ... other config
       networks:
         - media-network
   
   networks:
     media-network:
       external: true
   ```

3. Use service names in .env:
   ```env
   JELLYFIN_BASE_URL=http://jellyfin:8096
   JELLYSEERR_BASE_URL=http://jellyseerr:5055
   ```

### Host Network

If services are on the host network, use `localhost` or the host IP:

```env
JELLYFIN_BASE_URL=http://localhost:8096
JELLYSEERR_BASE_URL=http://localhost:5055
```

### Different Machines

Use IP addresses:

```env
JELLYFIN_BASE_URL=http://192.168.1.100:8096
JELLYSEERR_BASE_URL=http://192.168.1.101:5055
```

## Updating the App

### Method 1: Rebuild and Transfer (Option 1)

1. Build new image on dev machine
2. Save and transfer
3. On server: `docker-compose down`, load new image, `docker-compose up -d`

### Method 2: Git Pull and Rebuild (Option 2)

```bash
cd ~/canvas
git pull
docker-compose build
docker-compose up -d
```

## Accessing the App

Once running, access the app at:
- `http://localhost:8000` (on the server)
- `http://your-server-ip:8000` (from other devices on your network)

## Troubleshooting

### Check Container Status
```bash
docker-compose ps
docker-compose logs canvas
```

### Database Persistence
The database is stored in `./data/watchlist.db`. Make sure the `data/` directory exists and is writable:
```bash
mkdir -p data
chmod 755 data
```

### Port Already in Use
If port 8000 is already in use, change it in `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Use 8001 on host, 8000 in container
```

### Environment Variables Not Loading
Make sure `.env` file is in the same directory as `docker-compose.yml` and has correct syntax (no spaces around `=`).

## Backup

To backup your watchlist:
```bash
# Copy the database file
cp data/watchlist.db data/watchlist.db.backup
```

To restore:
```bash
# Stop the container
docker-compose down

# Restore the backup
cp data/watchlist.db.backup data/watchlist.db

# Start the container
docker-compose up -d
```

