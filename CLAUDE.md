# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Letterboxd Stats** is a full-stack monorepo application that enriches Letterboxd viewing history data with analytics and TMDB API integrations. The project consists of:

- **Frontend**: Next.js 16 TypeScript application with shadcn/ui components
- **Backend**: FastAPI Python application for file processing and API integration
- **Database**: PostgreSQL 15 with Docker Compose orchestration

## Architecture

### Monorepo Structure

```
letterboxd-stats/
├── frontend/               # Next.js App Router application (port 3000)
│   ├── app/               # Route definitions and layouts
│   ├── components/        # React components (layout, UI from shadcn/ui)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and helpers
│   ├── public/            # Static assets
│   └── types/             # TypeScript type definitions
├── backend/               # FastAPI application (port 8000)
│   ├── main.py           # Single entry point with API endpoints and TMDB integration
│   └── requirements.txt   # Python dependencies
├── docker-compose.yml     # Multi-service orchestration
└── README.md             # Project documentation
```

### Service Architecture

**Docker Services:**
1. **Frontend** (Node 24-alpine) - Next.js dev server on port 3000
2. **Backend** (Python 3.11-slim) - FastAPI with Uvicorn on port 8000
3. **Database** (PostgreSQL 15-alpine) - On port 5432 with health checks

The backend depends on a healthy database connection. All services use volume mounts for hot reloading during development.

### CORS Configuration

Backend CORS is currently restricted to `http://localhost:3000`. Update the `allow_origins` list in `backend/main.py:13` when deploying to production.

## Common Development Commands

### Frontend Commands

```bash
# Development server (Next.js with hot reload)
cd frontend && npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

### Backend Commands

```bash
# Development server (Uvicorn with hot reload via docker-compose)
docker-compose up backend

# Install Python dependencies
cd backend && pip install -r requirements.txt

# Note: main.py is a single monolithic file; structure it into modules as it grows
```

### Full Stack Setup

```bash
# Start all services (db, backend, frontend)
docker-compose up

# Start specific service
docker-compose up [frontend|backend|db]

# Stop all services
docker-compose down

# Rebuild images after dependency changes
docker-compose up --build
```

## Frontend Stack Details

- **Next.js 16** with App Router (Next.js 13+ file-based routing)
- **React 19.2.0** with TypeScript 5
- **Tailwind CSS 4** with PostCSS
- **shadcn/ui** components (Radix UI primitives wrapped with Tailwind styling)
- **Recharts 2.15.4** for charting
- **Axios 1.13.2** for HTTP requests
- **next-themes 0.4.6** for dark mode support
- **ESLint 9** with Next.js-specific rules

### Frontend Structure Notes

- Components are in `components/ui/` (shadcn/ui components) and `components/layout/` (custom layouts)
- All UI components inherit from shadcn/ui base components (in `components/ui/`)
- Theme toggle and provider setup in `components/layout/theme-toggle.tsx` and `theme-provider.tsx`
- The app uses the App Router with route grouping: `(auth)` routes are grouped for organization

## Backend Architecture

Currently a monolithic `main.py` file. Key components:

- **FastAPI initialization** (line 8)
- **CORS middleware** (lines 11-17) - restrict to production origins
- **TMDB API integration** (lines 19-85)
  - Uses TMDB_API_KEY from environment
  - Searches for movies and enriches with poster, rating, overview
  - Handles missing TMDB data gracefully
- **CSV upload endpoint** (lines 27-85)
  - Accepts diary.csv format
  - Returns most recent movie with TMDB enrichment

### Backend Configuration

**Environment Variables** (docker-compose.yml):
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: For JWT tokens (placeholder in development)
- `TMDB_API_KEY`: From `.env` file (not in docker-compose)

**Dependencies** (requirements.txt):
- FastAPI 0.121.0 with Pydantic 2.12.4 for validation
- Pandas 2.3.3 for CSV processing
- Requests 2.32.5 for external APIs
- Uvicorn 0.38.0 as ASGI server
- python-dotenv 1.2.1 for environment variables

## Important Notes

### Known Issues

1. **Docker Compose Port Typo** (docker-compose.yml:35):
   - Backend command has `--post 8000` instead of `--port 8000`
   - Should be corrected to `--port 8000`

2. **No Testing Infrastructure**:
   - No Jest/Vitest for frontend
   - No pytest/test directories for backend
   - Consider adding testing as features grow

3. **No Database Migrations**:
   - No ORM setup (SQLAlchemy) yet
   - No migration tool (Alembic) configured
   - Backend doesn't persist data to database currently

4. **Monolithic Backend**:
   - All logic in single `main.py` file
   - Will need module structure as more endpoints are added
   - Consider organizing into: routes/, services/, models/, schemas/

### API Endpoints

**Current Endpoints:**
- `GET /` - Health check
- `POST /upload` - CSV upload with TMDB enrichment

## Development Workflow

1. **Environment Setup**:
   - Ensure `.env` contains `TMDB_API_KEY`
   - Docker and Docker Compose installed

2. **Starting Development**:
   ```bash
   docker-compose up
   ```
   - Frontend accessible at `http://localhost:3000`
   - Backend API at `http://localhost:8000`
   - API docs at `http://localhost:8000/docs` (Swagger UI)

3. **Frontend Development**:
   - Changes hot-reload automatically
   - ESLint runs with `npm run lint`
   - TypeScript checking via tsconfig.json

4. **Backend Development**:
   - Changes hot-reload via Uvicorn `--reload` flag
   - API docs auto-generated at `/docs`
   - No database schema setup yet

## Technology Decisions

- **Next.js** over alternatives for unified Node.js frontend
- **FastAPI** for async Python backend with automatic API documentation
- **Docker Compose** for local multi-service development
- **shadcn/ui** for customizable, unstyled Radix UI components
- **PostgreSQL** for relational data (users, analytics, cached TMDB data)

## Future Considerations

- Implement authentication (JWT tokens referenced in backend)
- Set up database ORM and migrations
- Add unit/integration tests for both frontend and backend
- Modularize backend from monolithic structure
- Implement state management (Zustand is already available but not used)
- Add comprehensive error handling and logging
