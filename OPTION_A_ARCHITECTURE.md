# Option A: Simplify Current Version - Architecture & Design

## Overview

Option A keeps the database-driven architecture and scalability of the current version but **removes the async/thread complexity** that's causing the 14 critical issues.

**Core principle:** Replace APScheduler + async/thread hybrid with a **simple async loop** that runs in the FastAPI event loop.

---

## Current Problems We're Solving

### 1. APScheduler Event Loop Issues (Issue #1)
**Current:** APScheduler creates event loops in background threads
**Problem:** Conflicts with FastAPI's existing event loop
**Solution:** Use FastAPI's native async event loop instead

### 2. Thread Pool + Connection Pool Exhaustion (Issue #2)
**Current:** Each thread creates `SessionLocal()` → connection pool exhausted at ~15 connections
**Problem:** 10 concurrent enrichments × 2 DB ops = 20 needed connections (pool max: 15)
**Solution:** Use async SQLAlchemy (`sqlalchemy[asyncio]`) → no thread pool needed

### 3. Race Condition on Progress Counter (Issue #3)
**Current:** Multiple threads increment `enriched_count` simultaneously
**Problem:** Lost updates, corrupted progress
**Solution:** Single async task increments counter (no threads)

### 4. Session Status Never Updates (Issue #4)
**Current:** Missing `update_session_status('completed')` call
**Problem:** Session stuck in 'enriching' forever
**Solution:** Explicitly call status update when batch completes

### 5. TMDB Rate Limiting Ignored (Issue #5)
**Current:** Batches hammer TMDB without delays
**Problem:** 429 (Too Many Requests) errors
**Solution:** Add 2.5-second delays between batches (safe margin)

### 6. Other Issues (6-14)
**CSV parsing, connection validation, logging, retry logic** - addressed in implementation

---

## Architecture Diagram: Option A

```
┌─────────────────────────────────────────────────────────┐
│                      FastAPI App                        │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Async Event Loop                    │  │
│  │         (Native to FastAPI - running)            │  │
│  │                                                  │  │
│  │  ┌─────────────────────────────────────────┐   │  │
│  │  │  Background Enrichment Task             │   │  │
│  │  │  (EnrichmentWorker._run_loop)           │   │  │
│  │  │                                         │   │  │
│  │  │  Every 10 seconds:                      │   │  │
│  │  │  - Query enriching sessions             │   │  │
│  │  │  - For each session:                    │   │  │
│  │  │    └─ Get unenriched movies             │   │  │
│  │  │    └─ Process in batches of 10          │   │  │
│  │  │    └─ Concurrent TMDB calls (async)     │   │  │
│  │  │    └─ Save to DB (async SQLAlchemy)     │   │  │
│  │  │    └─ Wait 2.5s (rate limit)            │   │  │
│  │  │    └─ Update session status             │   │  │
│  │  └─────────────────────────────────────────┘   │  │
│  │                                                  │  │
│  │  ┌─────────────────────────────────────────┐   │  │
│  │  │  Request Handlers                       │   │  │
│  │  │  (Regular FastAPI endpoints)            │   │  │
│  │  │                                         │   │  │
│  │  │  POST /api/upload                       │   │  │
│  │  │  GET /api/session/{id}                  │   │  │
│  │  │  GET /api/session/{id}/movies           │   │  │
│  │  └─────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │
         │ Uses (async context)
         ▼
┌──────────────────────────────────────┐
│   Async SQLAlchemy Engine            │
│  (sqlalchemy[asyncio] with asyncpg)  │
│                                      │
│  Connection pool (async-native)      │
│  - No threads needed                 │
│  - True async I/O                    │
└──────────────────────────────────────┘
         │
         │
         ▼
┌──────────────────────────────────────┐
│      PostgreSQL (or SQLite)          │
│                                      │
│  Session table                       │
│  Movie table                         │
│  (30-day cleanup)                    │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│     TMDBClient (Async Requests)      │
│                                      │
│  - aiohttp (async HTTP)              │
│  - Retry with backoff                │
│  - Rate limiting (40 req/10s)        │
│  - In-memory cache (10min TTL)       │
└──────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. No APScheduler - Use Native Async Loop
**Why:**
- FastAPI already runs an async event loop
- APScheduler adds unnecessary complexity
- Thread management in async context causes bugs

**How:**
```python
# In main.py
async def start_enrichment_background():
    """Start background enrichment task"""
    asyncio.create_task(enrichment_worker.run_loop())

@app.on_event("startup")
async def startup():
    await start_enrichment_background()
```

**Benefit:** Single event loop, no thread conflicts, no "RuntimeError: asyncio.run() in running loop"

---

### 2. Async SQLAlchemy - No Thread Pool
**Why:**
- Current approach uses `asyncio.to_thread()` for DB ops
- Thread pool gets saturated with 10+ concurrent tasks
- Connection pool exhaustion at ~15 connections

**How:**
```python
# Old: Blocking DB in async context
await asyncio.to_thread(self._save_movie_enrichment, movie_id, data)

# New: Native async
async with AsyncSessionLocal() as db:
    await storage.update_movie_enrichment_async(movie_id, data)
```

**Benefit:** True async I/O, no threads, handles 100+ concurrent operations

---

### 3. Single Background Task - No Race Conditions
**Why:**
- Current code has multiple threads incrementing progress counter
- Race conditions cause progress stalls at partial counts

**How:**
```python
# Single task per session, not multiple threads
async def enrich_session_async(self, session_id):
    while unenriched_movies:
        batch = get_batch(10)
        # All operations happen in same task context
        await enrich_batch(batch)
        await increment_progress(len(batch))  # No race condition
        await asyncio.sleep(2.5)  # Rate limiting
```

**Benefit:** Atomic progress updates, no corruption

---

### 4. Explicit Status Transitions
**Why:**
- Current code never calls `update_session_status('completed')`
- Sessions stuck in 'enriching' forever

**How:**
```python
# Explicit state machine
Session status transitions:
uploading → parsing → processing → enriching → completed/failed

# Mark each transition explicitly
await update_session_status(session_id, 'enriching')
await enrich_all_movies()
await update_session_status(session_id, 'completed')  # Must happen
```

**Benefit:** Frontend knows when enrichment is done, no infinite polling

---

### 5. Built-in Rate Limiting
**Why:**
- TMDB limit: 40 requests per 10 seconds
- Current code ignores this, gets 429 errors
- Enrichment silently fails

**How:**
```python
# Process batches with delays
for batch_num, batch in enumerate(batches):
    await enrich_batch(batch)  # 10 concurrent TMDB calls

    if batch_num < total_batches - 1:
        await asyncio.sleep(2.5)  # Safe margin for TMDB limit

    # Rate limit: 10 requests / 2.5s = 4 requests/sec
    # Safe: TMDB allows 4 requests/second on average (40/10s)
```

**Benefit:** No 429 errors, 100% enrichment success rate

---

## Data Flow: Option A

### Step 1: Upload (Immediate Return)
```
POST /api/upload [CSV file(s)]
├── Validate files
├── Parse all CSV files
│   ├── watched.csv → Movie list
│   ├── ratings.csv → Rating updates
│   ├── diary.csv → Diary entries
│   └── likes.csv → Like flags
├── Merge by Letterboxd URI (deduplication)
├── Create session record in DB
├── Bulk insert movies (status='enriching')
└── Return session_id (async background enrichment starts)

Response: {
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enriching",
  "total_movies": 100
}
```

### Step 2: Background Enrichment (Async Loop)
```
Every 10 seconds, EnrichmentWorker wakes up:
1. Query sessions WHERE status='enriching'
2. For each session:
   a. Get unenriched movies
   b. Process in batches of 10
   c. For each batch:
      - Create 10 concurrent TMDB tasks
      - Each task: search + fetch details + extract genres/cast
      - Wait for all 10 to complete
      - Save results to DB (async SQLAlchemy)
      - Increment progress counter
      - Log batch completion
   d. Rate limit: sleep 2.5 seconds
   e. Repeat until all movies enriched
   f. Update session status → 'completed'
3. Move to next enriching session
```

**Key difference from current:**
- No APScheduler
- No threads
- No event loop conflicts
- No connection pool exhaustion
- Single async context throughout

### Step 3: Frontend Polling
```
Every 2-5 seconds (while status='enriching'):
GET /api/session/{session_id}/status

Response: {
  "status": "enriching",
  "enriched_count": 45,
  "total_movies": 100,
  "progress_percent": 45
}

When status='completed':
GET /api/session/{session_id}/movies

Response: [
  {
    "title": "Inception",
    "year": 2010,
    "rating": 5.0,
    "genres": ["Sci-Fi", "Action", "Thriller"],
    "runtime": 148,
    "directors": ["Christopher Nolan"],
    "cast": ["Leonardo DiCaprio", "Marion Cotillard", ...]
  },
  ...
]
```

---

## Database Schema (Same as Current)

### Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    status VARCHAR(20),  -- 'uploading', 'processing', 'enriching', 'completed', 'failed'
    total_movies INTEGER,
    enriched_count INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    expires_at TIMESTAMP,  -- 30 days from creation
    error_message TEXT
);
```

### Movies Table
```sql
CREATE TABLE movies (
    id INTEGER PRIMARY KEY,
    session_id UUID FOREIGN KEY,
    title VARCHAR(255),
    year INTEGER,
    rating FLOAT,
    watched_date DATE,
    letterboxd_uri VARCHAR(255) UNIQUE,
    tmdb_enriched BOOLEAN DEFAULT FALSE,
    tmdb_id INTEGER,
    -- JSONB columns for flexible schema
    genres JSONB,
    directors JSONB,
    cast JSONB,
    runtime INTEGER,
    imdb_rating FLOAT
);
```

---

## File Structure: Option A

```
backend/
├── main.py                          # Startup/shutdown, event lifecycle
│   ├── FastAPI app initialization
│   ├── Async startup hook (start enrichment)
│   ├── Async shutdown hook (cleanup)
│   └── Health check endpoints
│
├── requirements.txt                 # Dependencies (with sqlalchemy[asyncio])
│
├── .env.test                        # Test environment variables
│
├── app/
│   ├── __init__.py
│   │
│   ├── models/
│   │   └── database.py              # SQLAlchemy ORM models (SAME)
│   │       ├── Session
│   │       └── Movie
│   │
│   ├── schemas/
│   │   ├── upload.py                # Request/response schemas
│   │   └── session.py
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── upload.py                # POST /upload (REFACTORED)
│   │   ├── session.py               # GET /session endpoints (SAME)
│   │   └── health.py                # GET /health (NEW)
│   │
│   ├── services/                    # MAJOR REWRITE
│   │   ├── __init__.py
│   │   ├── csv_parser.py            # CSV parsing (SAME logic)
│   │   ├── tmdb_client.py           # Async TMDB client (IMPROVED)
│   │   │   ├── aiohttp instead of requests
│   │   │   ├── Retry with exponential backoff
│   │   │   ├── Rate limiting semaphore
│   │   │   └── In-memory cache
│   │   │
│   │   ├── enrichment_worker.py     # COMPLETELY REWRITTEN
│   │   │   ├── No APScheduler
│   │   │   ├── Async loop (run_loop)
│   │   │   ├── Batch processing with delays
│   │   │   ├── Explicit status updates
│   │   │   └── Comprehensive logging
│   │   │
│   │   └── storage.py               # Async DB operations (REFACTORED)
│   │       ├── Async SQLAlchemy session
│   │       ├── Transaction support
│   │       └── Progress tracking
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   └── session.py               # Async engine & SessionLocal (UPDATED)
│   │       ├── create_async_engine()
│   │       ├── AsyncSessionLocal
│   │       └── Connection pooling (no threads)
│   │
│   └── utils/
│       ├── logging.py               # Structured logging with trace IDs (NEW)
│       ├── exceptions.py            # Custom exceptions (NEW)
│       └── decorators.py            # Retry decorator (NEW)
│
├── tests/
│   ├── conftest.py                  # Pytest fixtures (NEW)
│   │   ├── test_db fixture (SQLite)
│   │   ├── mock_tmdb_client
│   │   └── sample_session_data
│   │
│   ├── test_csv_parsing.py          # CSV parser tests
│   ├── test_enrichment_async.py     # Enrichment worker tests (REWRITTEN)
│   ├── test_tmdb_async.py           # TMDB client tests (REWRITTEN)
│   ├── test_api_endpoints.py        # API route tests
│   └── test_integration.py          # End-to-end tests (NEW)
│
├── alembic/                         # Database migrations (SAME)
│   ├── versions/
│   └── env.py
│
└── Dockerfile                       # (UNCHANGED)
```

---

## Dependencies Changes

### Remove
```
APScheduler  # No longer needed
```

### Add
```
sqlalchemy[asyncio]>=2.0      # Async SQLAlchemy
asyncpg>=0.29                 # PostgreSQL async driver
aiohttp>=3.8                  # Async HTTP client (instead of requests)
python-dotenv>=1.0            # Environment variables
```

### Keep
```
fastapi>=0.121
uvicorn>=0.27
pandas>=2.0
pydantic>=2.0
psycopg2-binary>=2.9          # PostgreSQL driver (for sync ops if needed)
sqlalchemy>=2.0
alembic>=1.13
```

---

## Key Implementation Principles

### 1. Single Async Context
**Rule:** All database and API operations happen in the FastAPI event loop
**No:** Creating new event loops, using `asyncio.run()`, or `asyncio.new_event_loop()`
**Yes:** Using `async/await` throughout, `create_task()` for background work

### 2. Explicit Status Transitions
**Rule:** Every session has a clearly defined state
```
uploading → processing → enriching → completed
                    ↓
                  failed
```
**Must:** Call `update_session_status()` before transition
**Don't:** Leave sessions in intermediate states

### 3. Batch Atomicity
**Rule:** Treat each batch as a unit (10 movies)
```
- Fetch 10 movies from TMDB (concurrent)
- Save all 10 to DB (atomic transaction)
- Increment progress (happens after save succeeds)
- Wait before next batch (rate limiting)
```
**Benefit:** Progress counter is accurate, no lost updates

### 4. Retry Strategy
**Rule:** Transient failures get 3 attempts with exponential backoff
```
Attempt 1: immediate
Attempt 2: wait 2 seconds
Attempt 3: wait 4 seconds
Failure:   log and continue (don't block batch)
```
**Why:** Network hiccups don't cause data loss

### 5. Comprehensive Logging
**Rule:** Every significant operation is logged with context
```
[trace_id=a1b2c3d4] Session 550e8400... started enrichment
[trace_id=a1b2c3d4] Batch 1/10: Enriching 10 movies
[trace_id=a1b2c3d4] Movie "Inception": Enriched with TMDB ID 27205
[trace_id=a1b2c3d4] Batch 1 complete. Progress: 10/100
[trace_id=a1b2c3d4] Rate limiting: Waiting 2.5s
```
**Benefit:** Can trace any failure through logs

---

## Testing Strategy: Option A

### Unit Tests
- CSV parsing logic
- TMDB client (with mocked responses)
- Storage service (with test DB)
- API endpoints (with mocked enrichment)

### Integration Tests
- Full enrichment pipeline (real SQLite DB, real TMDB API)
- 100-movie upload test
- Error recovery (network failure, TMDB rate limit)
- Progress tracking accuracy

### Load Tests
- 10 concurrent uploads
- Connection pool behavior
- Memory usage over time

---

## Success Metrics: Option A

After implementation, you should see:

1. **Reliability:** 100% success rate for 100-movie uploads
2. **Performance:** 20-30 seconds total time for 100 movies (10 batches × 2.5s + 10 concurrent API calls/batch)
3. **Progress Accuracy:** enriched_count always matches actual DB count
4. **No Resource Leaks:** Same memory/connections after 10 uploads as after 1st
5. **Clear Debugging:** Can trace any issue through logs with trace IDs
6. **Backwards Compatible:** Existing API contracts unchanged

---

## Next Steps

1. Read **OPTION_A_IMPLEMENTATION.md** for file-by-file code changes
2. Read **OPTION_A_TESTING.md** for test cases and validation
3. Read **OPTION_A_DEBUGGING.md** for logging setup and troubleshooting

