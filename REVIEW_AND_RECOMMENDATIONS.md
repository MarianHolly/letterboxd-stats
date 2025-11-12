# TMDB ENRICHMENT: REVIEW AND RECOMMENDATIONS

**Date**: November 12, 2025
**Phase**: Implementation Review & Planning
**Branch**: `backend/6-tmdb-enrichment`

## Executive Summary

The letterboxd-stats application is well-structured with a complete Phase 1 implementation (CSV parsing and basic storage). The IMPLEMENTATION.md outlines appropriate Phase 2 tasks for TMDB enrichment. However, after reviewing the actual codebase, several improvements and clarifications are recommended before coding begins.

### Key Findings
✅ **Strengths**:
- Database schema fully prepared (all TMDB fields exist and are nullable)
- Clean service layer architecture
- Frontend ready for backend integration
- Appropriate async/background task architecture planned

⚠️ **Issues Found**:
- 1 naming conflict: `metadata` vs `upload_metadata` in database
- 1 incorrect status transition: status set to 'enriching' before background worker starts
- Missing dependency: APScheduler not in requirements.txt
- Missing query methods: No way to get unenriched movies efficiently

---

## Application Architecture Overview

### Backend Stack
- **Framework**: FastAPI 0.121.0 (async, high-performance)
- **Database**: PostgreSQL + SQLAlchemy ORM
- **Key Components**:
  - Session management (UUID, 30-day expiry)
  - CSV parser (supports watched, diary, ratings, likes)
  - Storage service (abstraction layer)
  - API endpoints (upload, session status, movies list)

### Frontend Stack
- **Framework**: Next.js 16 + React 19
- **State**: Zustand (client-side)
- **Data Processing**: Client-side CSV parsing + normalization
- **Charts**: Recharts library
- **HTTP Client**: Axios (ready, unused)

### Database State
**All TMDB enrichment fields already exist in Movie model**:
```
✓ tmdb_enriched (boolean)
✓ tmdb_id (integer)
✓ genres (JSON array)
✓ directors (JSON array)
✓ cast (JSON array)
✓ runtime (integer)
✓ budget (integer)
✓ revenue (integer)
✓ popularity (float)
✓ vote_average (float)
✓ enriched_at (datetime)
```

---

## Issues Identified

### Issue 1: Database Naming Conflict (MINOR)
**Location**: `app/models/database.py:82` & `app/api/session.py:91`

**Problem**:
```python
# In database.py:82
upload_metadata = Column(JSON, default={}, nullable=False)

# In session.py:91 (SessionDetailsResponse)
metadata=session.metadata  # ← This will fail!
```

**Impact**: SessionDetailsResponse endpoint will crash with AttributeError

**Fix**: Change session.py line 91 to:
```python
metadata=session.upload_metadata
```

### Issue 2: Incorrect Status Transition (MODERATE)
**Location**: `app/api/upload.py:89`

**Current Flow**:
1. Parse movies ✓
2. Store movies ✓
3. **Set status='enriching' immediately** ← Problem
4. Backend worker hasn't started yet

**Problem**:
- Frontend starts polling for enrichment progress before background worker begins
- Progress bar shows 0/N from the start
- Confusing UX

**Better Flow**:
1. Create session with status='uploading'
2. Parse & validate CSV
3. Store movies, set status='processing' (initial batch complete)
4. Return response to frontend
5. Background worker picks up and changes to 'enriching' and then 'completed'

**Impact**: Minor UX issue, not a blocking bug

**Recommendation**:
- Keep current simple approach for now (status='enriching' immediately)
- Document this in comments
- Can be improved in Phase 3

### Issue 3: Missing Dependency
**Location**: `requirements.txt`

**Problem**: APScheduler not listed

**Solution**: Add to requirements.txt:
```
APScheduler==3.10.4
```

### Issue 4: Missing Storage Service Methods
**Location**: `app/services/storage.py`

**Missing Method 1**: Get unenriched movies for a session
```python
def get_unenriched_movies(self, session_id: str) -> List[Movie]:
    """Get all movies that haven't been enriched with TMDB data yet."""
    return self.db.query(Movie).filter(
        Movie.session_id == session_id,
        Movie.tmdb_enriched == False
    ).all()
```

**Missing Method 2**: Update movie with enrichment data
```python
def update_movie_enrichment(self, movie_id: int, tmdb_data: dict) -> None:
    """Update movie with TMDB enrichment data."""
    movie = self.db.query(Movie).filter(Movie.id == movie_id).first()
    if movie:
        movie.tmdb_id = tmdb_data.get('tmdb_id')
        movie.genres = tmdb_data.get('genres')
        movie.directors = tmdb_data.get('directors')
        movie.cast = tmdb_data.get('cast')
        movie.runtime = tmdb_data.get('runtime')
        movie.budget = tmdb_data.get('budget')
        movie.revenue = tmdb_data.get('revenue')
        movie.popularity = tmdb_data.get('popularity')
        movie.vote_average = tmdb_data.get('vote_average')
        movie.tmdb_enriched = True
        movie.enriched_at = datetime.utcnow()
        self.db.commit()
```

**Missing Method 3**: Get enriching sessions
```python
def get_enriching_sessions(self) -> List[Session]:
    """Get all sessions currently being enriched."""
    return self.db.query(Session).filter(
        Session.status == 'enriching'
    ).all()
```

---

## Recommended Implementation Plan

### Phase 2A: Core Services (No Dependencies)

#### Task 2.1: TMDB Client Service
**File**: Create `app/services/tmdb_client.py`

**Responsibilities**:
- Search for movies by title + year
- Fetch detailed movie data by TMDB ID
- Handle API errors gracefully
- Optional: Simple in-memory caching

**Key Methods**:
```python
class TMDBClient:
    def __init__(self, api_key: str)
    def search_movie(self, title: str, year: Optional[int]) -> Optional[Dict]
    def get_movie_details(self, tmdb_id: int) -> Optional[Dict]
```

**Error Handling**:
- Movie not found (404): Return None, log as info
- API errors (5xx): Log warning, return None
- Rate limits (429): Implement exponential backoff
- Timeouts: Return None after 3 retries

**Caching Strategy** (Optional):
```python
self._cache = {}  # {search_key: (result, timestamp)}
self._cache_ttl = 600  # 10 minutes
```

#### Task 2.2: Update Storage Service
**File**: Modify `app/services/storage.py`

**Add Methods**:
1. `get_unenriched_movies(session_id)` - Query with `tmdb_enriched=False`
2. `update_movie_enrichment(movie_id, tmdb_data)` - Bulk update enrichment fields
3. `get_enriching_sessions()` - Get sessions with status='enriching'

#### Task 2.3: Enrichment Worker Service
**File**: Create `app/services/enrichment_worker.py`

**Responsibilities**:
- Background scheduler for enrichment jobs
- Poll for 'enriching' sessions
- Enrich each session's movies
- Handle partial failures gracefully

**Implementation Approach**: APScheduler
- Simpler than Celery (no message broker)
- Works directly with FastAPI
- Built-in error handling

**Key Methods**:
```python
class EnrichmentWorker:
    def __init__(self, tmdb_client: TMDBClient, storage: StorageService)

    def start_scheduler(self) -> None
        """Start background scheduler on app startup"""

    def enrich_sessions(self) -> None
        """Main job: runs every 10 seconds"""
        # 1. Get sessions with status='enriching'
        # 2. For each session: enrich_session(session_id)

    def enrich_session(self, session_id: str) -> None
        # 1. Get unenriched movies
        # 2. For each movie: search + fetch from TMDB
        # 3. Update movie if found
        # 4. Update session.enriched_count
        # 5. If all done: set status='completed'

    def stop_scheduler(self) -> None
        """Stop scheduler on app shutdown"""
```

### Phase 2B: Integration (Depends on Phase 2A)

#### Task 2.4: Update Main Application
**File**: Modify `app/main.py`

**Changes**:
```python
# Imports
from app.services.tmdb_client import TMDBClient
from app.services.enrichment_worker import EnrichmentWorker

# At module level
tmdb_client = None
enrichment_worker = None

@app.on_event("startup")
async def startup_event():
    global tmdb_client, enrichment_worker

    # ... existing init_db code ...

    # Initialize TMDB client
    api_key = os.getenv("TMDB_API_KEY")
    if not api_key:
        logger.error("TMDB_API_KEY not set - enrichment will not work")
    else:
        tmdb_client = TMDBClient(api_key)

    # Start enrichment worker
    enrichment_worker = EnrichmentWorker(tmdb_client, storage)
    enrichment_worker.start_scheduler()
    logger.info("[OK] Enrichment worker started")

@app.on_event("shutdown")
async def shutdown_event():
    global enrichment_worker

    # ... existing close_db code ...

    if enrichment_worker:
        enrichment_worker.stop_scheduler()
        logger.info("[OK] Enrichment worker stopped")
```

#### Task 2.5: Update API Schemas
**File**: Modify `app/schemas/session.py`

**Change**: MovieResponse already includes TMDB fields! Just verify they're returned:
```python
class MovieResponse(BaseModel):
    # ... existing fields ...
    genres: Optional[List[str]] = None
    directors: Optional[List[str]] = None
    cast: Optional[List[str]] = None
    runtime: Optional[int] = None
    tmdb_id: Optional[int] = None
    tmdb_enriched: Optional[bool] = False
```

**Verify**: Check that `/api/session/{session_id}/movies` returns these fields

#### Task 2.6: Fix Database Naming Issue
**File**: Modify `app/api/session.py:91`

**Change**:
```python
# Before
metadata=session.metadata

# After
metadata=session.upload_metadata
```

#### Task 2.7: Frontend Integration
**Files**: Frontend components

**Required Changes**:
1. Create enrichment status polling hook
2. Update dashboard to show enrichment progress
3. Display TMDB genres in genre chart
4. Display TMDB directors in director rankings

**Specific Implementation**:
1. Create `useEnrichmentStatus` hook in frontend/hooks/:
   ```typescript
   useEnrichmentStatus(sessionId: string, pollInterval: 2000)
   // Polls GET /api/session/{session_id}/status
   // Returns: { status, enriched_count, total_movies, progress_percent }
   ```

2. Update dashboard to show progress bar while enriching

3. Update genre/director charts to use TMDB data from `/api/session/{session_id}/movies`

---

## Implementation Order (Recommended)

```
PHASE 2A (Core Services):
├── 2.1: Create TMDBClient service
├── 2.2: Add methods to StorageService
└── 2.3: Create EnrichmentWorker service

PHASE 2B (Integration):
├── 2.4: Update main.py
├── 2.5: Verify API schemas
├── 2.6: Fix naming issue (quick fix)
└── 2.7: Frontend integration

TESTING:
├── Unit tests for TMDBClient
├── Integration tests for EnrichmentWorker
├── End-to-end test: upload → enrichment → display
└── Error case tests (movie not found, API errors)
```

---

## Database Optimization (Optional)

### Add Index for Enrichment Queries
```python
# In alembic migration or with raw SQL:
CREATE INDEX idx_movies_session_tmdb ON movies(session_id, tmdb_enriched);
```

**Impact**: 10-100x faster queries for `get_unenriched_movies()`

### Add Constraint (Optional)
```python
# One movie per session per URI (prevent duplicates)
ALTER TABLE movies ADD CONSTRAINT uq_movie_per_session
    UNIQUE(session_id, letterboxd_uri);
```

---

## Configuration Required

### Environment Variables
```bash
# .env file
TMDB_API_KEY=your_api_key_from_themoviedb.org
DATABASE_URL=postgresql://user:password@localhost:5432/letterboxddb

# Optional
TMDB_CACHE_TTL=600  # seconds
ENRICHMENT_POLL_INTERVAL=10  # seconds
```

### Get TMDB API Key
1. Go to https://www.themoviedb.org/settings/api
2. Create an account (free)
3. Request an API key
4. Copy into `.env`

---

## Success Criteria (Updated)

- [✓] Database schema prepared (already done)
- [ ] TMDB client service implemented and tested
- [ ] Background enrichment worker implemented
- [ ] StorageService methods added
- [ ] Main.py updated with worker initialization
- [ ] API schemas verified to return TMDB data
- [ ] Naming conflict fixed (metadata → upload_metadata)
- [ ] Frontend polls enrichment status
- [ ] Progress bar displays during enrichment
- [ ] Genre/director charts show TMDB data
- [ ] Movie not found handled gracefully
- [ ] Rate limiting implemented
- [ ] All Phase 1 functionality preserved
- [ ] End-to-end testing completed

---

## Known Limitations & Future Improvements

### Phase 2 Scope
- Single-threaded enrichment worker (sufficient for Phase 2)
- No horizontal scaling (can be added in Phase 3)
- Simple in-memory caching (no Redis)
- Manual re-enrichment only (no API endpoint yet)

### Phase 3 Improvements
- Add re-enrichment endpoint for failed movies
- Implement horizontal scaling with Celery
- Add Redis caching for better performance
- Add enrichment statistics dashboard
- Implement async TMDB client (httpx)

---

## Summary of Changes to IMPLEMENTATION.md

### What's Correct ✅
1. High-level architecture flow
2. Task identification (4 main tasks)
3. Success criteria comprehensive
4. Phase concept sound

### What Needs Clarification ⚠️
1. **Specify APScheduler** - Not Celery (simpler, suitable)
2. **Detail error handling** - What to do with movie not found?
3. **Specify rate limiting** - Simple delay or queue?
4. **Fix status transitions** - When should status change?
5. **Add storage methods** - List the required new methods
6. **Frontend polling** - Document polling interval and strategy
7. **Fix naming issue** - metadata vs upload_metadata

### What's Missing
1. APScheduler in requirements.txt
2. Storage service method signatures
3. Specific TMDB API error handling
4. Database optimization (indices)
5. Configuration examples (.env)
6. Implementation order/dependencies

---

## Next Steps

1. **Review this document** with the team
2. **Add APScheduler to requirements.txt**
3. **Fix the metadata naming issue** (quick 1-line fix)
4. **Proceed with Phase 2A implementation** in order: TMDBClient → StorageService → EnrichmentWorker
5. **Code and test each component** before moving to Phase 2B
6. **End-to-end testing** with real Letterboxd data

---

## Conclusion

The application architecture is solid and well-prepared for TMDB enrichment. The main issues are minor (naming conflict, missing methods) and easily addressable. The implementation plan is straightforward with clear dependencies between tasks.

**Recommendation**: Proceed with implementation using the refined plan outlined above. The codebase quality is good and follows best practices (service layer, dependency injection, error handling).

**Estimated Effort**:
- TMDB Client: 2-3 hours
- Storage methods: 1 hour
- Enrichment Worker: 3-4 hours
- Integration & testing: 2-3 hours
- Frontend: 2-3 hours
- **Total Phase 2**: ~13-16 hours
