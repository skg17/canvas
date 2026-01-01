# Canvas Frontend

React frontend for the Canvas watchlist application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (optional, for development):
```env
VITE_JELLYSEERR_BASE_URL=http://localhost:5055
VITE_JELLYFIN_BASE_URL=http://localhost:8096
```

3. Start development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000` and proxy API requests to `http://localhost:8000`.

## Build for Production

```bash
npm run build
```

This creates a `dist/` directory with the production build, which is served by the FastAPI backend.

## Development

- The frontend uses Vite for fast development
- Tailwind CSS for styling
- React 18 with hooks
- Axios for API calls

