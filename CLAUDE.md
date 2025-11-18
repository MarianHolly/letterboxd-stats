# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Letterboxd Stats Analytics** is a full-stack application that transforms Letterboxd viewing history into interactive analytics and insights. Users upload their Letterboxd CSV exports to access free comprehensive statistics (no premium subscription required), with TMDB API enrichment for enhanced metadata.

**Tech Stack:**
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** FastAPI 0.121.0, Python 3.11, PostgreSQL 15, SQLAlchemy 2.0
- **Infrastructure:** Docker Compose, Uvicorn, APScheduler
- **Key Libraries:** Pandas, NumPy, aiohttp (async TMDB), Zustand (state)

---

## Common Development Commands

### Frontend

```bash
cd frontend

# Development
npm install            # Install dependencies
npm run dev            # Start dev server (port 3000, auto-reload)
npm run build          # Production build
npm start              # Run production server

# Testing
npm test               # Run Jest tests
npm test:watch        # Run tests in watch mode
npm test:coverage     # Generate coverage report
npm run test:e2e      # Run Playwright E2E tests (headless)
npm run test:e2e:ui   # Run E2E tests with UI
npm run test:e2e:debug # Run E2E tests in debug mode

# Linting
npm run lint           # Run ESLint
```

### Backend

```bash
cd backend

# Setup
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Development
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Database migrations
alembic upgrade head   # Apply all pending migrations
alembic downgrade -1   # Rollback one migration
alembic revision -m "description"  # Create new migration

# Testing
pytest                 # Run all tests
pytest -v              # Verbose output
pytest tests/test_*.py # Run specific test file
pytest -v --tb=short  # Run with short traceback
pytest -k "test_name"  # Run specific test by name
pytest --cov=.        # Run with coverage report
```

### Docker

```bash
# Full stack development (all services)
docker-compose up      # Start all services (foreground)
docker-compose up -d   # Start all services (background)
docker-compose down    # Stop and remove containers
docker-compose logs -f [service_name]  # View logs (backend, frontend, db)

# Service-specific
docker-compose up db backend  # Start only database and backend
docker-compose build          # Rebuild images
docker-compose build --no-cache  # Rebuild without cache
```

### Database

```bash
# Via Docker Compose
docker-compose exec db psql -U letterboxduser -d letterboxddb

# Connection info
# Host: localhost
# Port: 5432
# User: letterboxduser
# Password: securepassword
# Database: letterboxddb
```

---

## Architecture & Key Patterns

### Data Flow Pipeline

1. **Upload Phase:** User uploads Letterboxd CSV files (watched.csv, ratings.csv, diary.csv, likes.csv)
2. **Parsing Phase:** `LetterboxdParser` (backend/app/services/csv_parser.py) converts CSV to normalized format, keyed by Letterboxd URI
3. **Session Creation:** `StorageService` creates session record + stores movies in database with status='enriching'
4. **Async Enrichment:** `EnrichmentWorker` polls every 10 seconds, fetches TMDB data concurrently (10 requests/batch)
5. **Progress Polling:** Frontend polls `/api/session/{id}` endpoint to display enrichment progress
6. **Analytics Display:** Frontend receives enriched data and renders interactive charts

### Critical Services

#### LetterboxdParser (`backend/app/services/csv_parser.py`)
- Parses all Letterboxd CSV files (watched, ratings, diary, likes)
- **Key Design:** Uses Letterboxd URI as primary key (not title+year)
- Supports rewatches (multiple watch entries per movie)
- Returns normalized data structure mapped to database models

#### TMDBClient (`backend/app/services/tmdb_client.py`)
- Rate-limited TMDB API client (40 requests/10 seconds)
- Async HTTP client using aiohttp
- In-memory caching (10-minute TTL)
- Searches for movies by title+year and fetches detailed metadata

#### EnrichmentWorker (`backend/app/services/enrichment_worker.py`)
- APScheduler background task (runs every 10 seconds)
- Finds sessions with status='enriching'
- Processes movies with concurrent async requests (10 at a time)
- Updates `enriched_count` progress counter in real-time
- Marks sessions as 'completed' when finished

#### StorageService (`backend/app/services/storage.py`)
- CRUD operations for sessions and movies
- Session lifecycle: uploading → processing → enriching → completed/failed
- Movie storage with TMDB metadata (JSONB columns for flexible schema)

### Database Schema

**Sessions Table**
- `id` (UUID): Unguessable, shareable session identifier
- `status`: Lifecycle status (uploading, processing, enriching, completed, failed)
- `total_movies`, `enriched_count`: Denormalized for fast progress polling
- `expires_at`: 30-day expiry for automatic cleanup
- `upload_metadata`: Flexible JSON for file info

**Movies Table**
- `session_id` (FK): Links to parent session (cascade delete)
- `title`, `year`, `rating`, `watched_date`: CSV fields from upload
- `letterboxd_uri`: Unique identifier (primary key for deduplication)
- `tmdb_enriched`, `tmdb_id`: Enrichment status and metadata
- `genres`, `directors`, `cast`, `runtime`, etc: JSONB columns for TMDB data

### Frontend State Management

Uses Zustand for global state with persistence:
- `useUploadStore`: Manages file upload state
- `useEnrichmentStatus`: Polling loop for progress updates
- `useAnalytics`: Analytics data aggregation and chart data

---

## Project Structure

```
letterboxd-stats/
├── backend/                          # FastAPI application
│   ├── main.py                      # Entry point (startup/shutdown hooks)
│   ├── requirements.txt              # Python dependencies
│   ├── app/
│   │   ├── api/                     # Route handlers (upload.py, session.py, test.py)
│   │   ├── models/database.py       # SQLAlchemy ORM models (Session, Movie)
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── services/                # Business logic
│   │   │   ├── csv_parser.py        # CSV parsing (v2.0)
│   │   │   ├── tmdb_client.py       # TMDB API client (async, rate-limited)
│   │   │   ├── enrichment_worker.py # Background enrichment scheduler
│   │   │   └── storage.py           # Database operations
│   │   └── db/session.py            # Connection pooling, SessionLocal factory
│   ├── tests/                        # pytest test suite
│   ├── alembic/                      # Database migrations
│   └── Dockerfile
│
├── frontend/                          # Next.js application
│   ├── app/                         # App Router pages
│   │   ├── page.tsx                # Landing page with upload
│   │   ├── layout.tsx              # Root layout
│   │   ├── dashboard/page.tsx      # Dashboard with charts
│   │   └── analytics/page.tsx      # Analytics page
│   ├── components/                  # React components
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── layout/                 # Navbar, footer, theme
│   │   ├── landing/                # Landing page sections
│   │   ├── dashboard/              # Dashboard layout & charts
│   │   └── analytics/              # Analytics components
│   ├── hooks/                       # Custom React hooks
│   │   ├── use-upload-store.ts     # Zustand upload state
│   │   ├── use-enrichment-status.ts # Polling hook
│   │   └── use-analytics.ts        # Analytics data hook
│   ├── lib/                         # Utilities
│   │   ├── csv-parser.ts           # Client-side CSV parsing
│   │   └── utils.ts                # General helpers
│   ├── src/lib/data-processors/    # Data transformation
│   │   ├── normalize.ts            # Normalize raw data
│   │   ├── diary-processor.ts      # Diary entry processing
│   │   ├── ratings-processor.ts    # Rating aggregation
│   │   └── watched-processor.ts    # Watch history processing
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.ts
│   ├── next.config.ts
│   └── Dockerfile
│
├── e2e/                             # Playwright E2E tests
├── docs/                            # Documentation
│   ├── INDEX.md                    # Doc navigation guide (START HERE)
│   ├── TECHNICAL_ANALYSIS.md       # Deep technical dive
│   └── TESTING_GUIDE.md            # Testing strategies
├── docker-compose.yml               # Full stack orchestration
├── .env                             # Environment variables (TMDB keys, DB URL)
└── README.md
```

---

## Key Development Notes

### Backend

**Session & Movie Processing:**
- Session UUID is created immediately on upload (shareable identifier)
- Movies are parsed and inserted into database with `status='enriching'`
- EnrichmentWorker runs asynchronously, updating progress without blocking
- Database uses cascade delete: removing session removes all its movies

**Async Patterns:**
- TMDBClient uses aiohttp for concurrent TMDB API calls
- EnrichmentWorker processes movies in batches (10 concurrent requests)
- APScheduler manages background task lifecycle
- SessionLocal factory creates fresh DB sessions per polling cycle (thread-safe)

**Database Connections:**
- Connection pooling via SQLAlchemy sessionmaker
- EnrichmentWorker receives `SessionLocal` factory, not a single session instance
- Each polling cycle creates its own session (prevents connection exhaustion)

### Frontend

**Upload Flow:**
- Client-side CSV parsing (Papa Parse)
- File metadata stored in Zustand (for resumable uploads in future)
- Upload POSTs file data to `/api/upload`
- Response includes session UUID for progress polling

**Progress Polling:**
- `useEnrichmentStatus` hook polls `/api/session/{id}` every 2-5 seconds
- Updates Zustand store with `enriched_count / total_movies`
- Frontend displays progress bar
- Polling stops when session status changes from 'enriching'

**Data Processing:**
- Data processors normalize CSV data before storage
- Zustand stores persist to localStorage for session recovery
- Chart components consume data from hooks with memoization

### Environment Variables

Required in `.env`:
```
TMDB_API_KEY=<your-tmdb-api-key>
DATABASE_URL=postgresql://user:password@host:port/dbname
```

For Docker Compose (auto-set):
- Uses `postgres://letterboxduser:securepassword@db:5432/letterboxddb`
- Backend env is set in docker-compose.yml

---

## Testing Strategy

### Backend Tests

```bash
# Run all tests with coverage
pytest -v --cov=. --cov-report=html

# Test files to focus on
pytest tests/test_csv_parsing.py      # CSV parsing logic
pytest tests/test_enrichment_async.py # Enrichment worker
pytest tests/test_tmdb_async.py       # TMDB client
pytest tests/test_api_endpoints.py    # API routes
```

**Key Test Patterns:**
- Use `pytest-asyncio` for async function testing
- Mock TMDB API calls (use fixtures)
- Test session lifecycle and status transitions
- Verify cascade delete behavior

### Frontend Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e           # Headless
npm run test:e2e:ui        # With browser UI
npm run test:e2e:debug     # Debug mode
```

**Key Test Patterns:**
- Test CSV parsing and validation
- Test upload flow with mocked API
- Test progress polling behavior
- Test chart component rendering with sample data

---

## Debugging Tips

### Backend Debugging

**View enrichment worker logs:**
```bash
docker-compose logs -f backend | grep -i "enrichment"
```

**Debug TMDB API calls:**
- Add logging in `TMDBClient` before/after API calls
- Check rate limiting behavior (logs show request counts)

**Database queries:**
- Enable SQLAlchemy query logging: `logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)`
- Check migrations status: `alembic current`

### Frontend Debugging

**Check upload state:**
- Open browser DevTools → Console
- `localStorage.getItem('upload-store')` shows Zustand state

**Monitor API calls:**
- DevTools → Network tab
- Watch POST to `/api/upload` and polling to `/api/session/{id}`

**React DevTools:**
- Install React DevTools browser extension
- Inspect Zustand stores directly

---

## Known Issues & Technical Debt

- Dashboard/analytics pages are scaffolded but need data integration
- Some chart components need data processing for live data
- Frontend data processors (normalize, diary, etc.) partially implemented
- Authentication/user sessions not yet implemented
- Error handling edge cases need more coverage

---

## Deployment Considerations

- Frontend: Vercel (auto-deploys from main branch)
- Backend: Railway or Render (uses Docker image)
- Database: Neon or Supabase (PostgreSQL)
- Sessions expire after 30 days (automatic cleanup)
- TMDB API key must be set in production environment

---

## References

**Key Files to Read First:**
1. `backend/main.py` - Entry point with startup/shutdown
2. `backend/app/models/database.py` - Schema with design rationale
3. `backend/app/services/enrichment_worker.py` - Async enrichment logic
4. `frontend/hooks/use-enrichment-status.ts` - Progress polling pattern
5. `docs/TECHNICAL_ANALYSIS.md` - Full technical deep dive

**External Resources:**
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM Docs](https://docs.sqlalchemy.org/en/20/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TMDB API Docs](https://www.themoviedb.org/documentation/api)
