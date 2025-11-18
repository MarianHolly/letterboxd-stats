# Option A: START HERE

You have 4 comprehensive documents for Option A implementation:

1. **OPTION_A_ARCHITECTURE.md** - Read this first (20 mins)
   - Why Option A solves the 14 critical issues
   - Architecture diagrams
   - Data flow explanations
   - Design decisions and principles

2. **OPTION_A_IMPLEMENTATION.md** - Code changes (2-3 hours)
   - Phase 1: Setup & Dependencies (30 mins)
   - Phase 2: Database Setup (30 mins)
   - Phase 3: Services Rewrite (2-3 hours)
   - Phase 4: Update main.py
   - Phase 5: Update API endpoints
   - Phase 6: Database models

3. **OPTION_A_TESTING.md** - Test cases (in progress)
   - Unit tests
   - Integration tests
   - Load tests

4. **OPTION_A_DEBUGGING.md** - Logging & troubleshooting (in progress)
   - Logging strategy
   - Common errors
   - How to debug

---

## Quick Start: Option A (PostgreSQL, Async SQLAlchemy)

### Day 1: Architecture & Planning
- [ ] Read `OPTION_A_ARCHITECTURE.md` (20 mins)
- [ ] Understand the 5 key design decisions
- [ ] Review data flow diagrams

### Day 2-3: Phase 1 & 2 Setup
- [ ] Read `OPTION_A_IMPLEMENTATION.md` Phase 1 & 2 (30 mins)
- [ ] Update `requirements.txt` (5 mins)
- [ ] Create `.env.test` file (5 mins)
- [ ] Update `backend/app/db/session.py` (15 mins)
- [ ] Test database connection works
- [ ] Run basic test to verify setup

### Day 3-4: Phase 3 Services
- [ ] Read implementation Phase 3 (30 mins)
- [ ] Rewrite `backend/app/services/tmdb_client.py` (1 hour)
  - [ ] Test: Verify TMDB search works
  - [ ] Test: Verify retry logic works
  - [ ] Test: Verify rate limiting works
- [ ] Rewrite `backend/app/services/enrichment_worker.py` (1.5 hours)
  - [ ] Test: Verify batch processing works
  - [ ] Test: Verify progress counter increments
  - [ ] Test: Verify status updates to 'completed'
- [ ] Rewrite `backend/app/services/storage.py` (30 mins)
  - [ ] Test: Verify async DB operations work

### Day 4-5: Phase 4 & 5 Integration
- [ ] Update `backend/main.py` (30 mins)
  - [ ] Test: App starts without errors
  - [ ] Test: Startup hooks work
  - [ ] Test: Shutdown hooks work
- [ ] Update `backend/app/api/upload.py` (30 mins)
  - [ ] Test: CSV upload works
  - [ ] Test: Session created
  - [ ] Test: Enrichment starts
- [ ] Update `backend/app/api/session.py` (30 mins)
  - [ ] Test: Status endpoint works
  - [ ] Test: Progress updates
  - [ ] Test: Movies endpoint returns data

### Day 5-6: Testing
- [ ] Run full integration test (100-movie upload)
  - [ ] Test: All movies enriched successfully
  - [ ] Test: Progress counter accurate
  - [ ] Test: Session status = 'completed'
  - [ ] Test: Results returned correctly

### Day 6-7: Validation & Optimization
- [ ] Test with real Letterboxd CSV (~1000 movies)
- [ ] Monitor performance
- [ ] Check for memory leaks
- [ ] Verify no resource exhaustion

---

## Key Files to Update

```
backend/
├── requirements.txt                           ← Phase 1: Update deps
├── .env.test                                  ← Phase 1: Create test env
├── app/
│   ├── db/session.py                          ← Phase 2: Async engine
│   ├── services/
│   │   ├── tmdb_client.py                     ← Phase 3: Rewrite (async)
│   │   ├── enrichment_worker.py               ← Phase 3: Rewrite (no APScheduler)
│   │   └── storage.py                         ← Phase 3: Async operations
│   ├── api/
│   │   ├── upload.py                          ← Phase 5: Use AsyncSession
│   │   └── session.py                         ← Phase 5: Use AsyncSession
│   └── models/database.py                     ← Phase 6: Add error_message field
├── main.py                                    ← Phase 4: Async lifespan
└── tests/
    ├── conftest.py                            ← New: Async fixtures
    ├── test_tmdb_async.py                     ← Rewrite: Async tests
    ├── test_enrichment_async.py               ← Rewrite: Async tests
    └── test_api_endpoints.py                  ← Update: Use AsyncSession
```

---

## Testing Strategy: Option A

### Quick Validation (Each Phase)
After each phase, run one quick test to verify it works:

**Phase 1-2 (Setup):**
```bash
python -c "from app.db.session import AsyncSessionLocal; print('✓ Async engine works')"
```

**Phase 3a (TMDB Client):**
```bash
# See test_tmdb_async.py
pytest tests/test_tmdb_async.py::test_search_movie -v
```

**Phase 3b (Enrichment Worker):**
```bash
# See test_enrichment_async.py
pytest tests/test_enrichment_async.py::test_enrich_batch -v
```

**Phase 4-5 (API Integration):**
```bash
# Start server
uvicorn main:app --reload

# Test upload
curl -X POST http://localhost:8000/api/upload \
  -F "files=@tests/data/sample.csv"
```

**Phase 6 (End-to-End):**
```bash
# Upload real CSV with 100 movies
# Check progress every 2s for 30s
# Verify all movies enriched

pytest tests/test_integration.py::test_100_movie_upload -v
```

---

## Database Setup

### PostgreSQL (Production)
```bash
# Ensure .env has:
DATABASE_URL=postgresql+asyncpg://letterboxduser:securepassword@db:5432/letterboxddb

# Start with Docker Compose
docker-compose up db -d

# Run migrations
alembic upgrade head
```

### SQLite (Testing)
```bash
# Use .env.test:
DATABASE_URL=sqlite+aiosqlite:///test_letterboxd.db

# Database will auto-create
pytest tests/
```

---

## Expected Results: Option A

After full implementation, you should see:

✅ **Reliability:** 100% success rate for 100-movie uploads
✅ **Performance:** 20-30 seconds for 100 movies (async concurrent)
✅ **Progress tracking:** Real-time status updates, accurate counter
✅ **No blocking:** Upload returns immediately, enrichment in background
✅ **Error handling:** Clear error messages, automatic retries, graceful failures
✅ **Debugging:** Full trace IDs in logs, easy to follow any enrichment
✅ **Scalability:** No connection pool exhaustion, handles 50+ concurrent enrichments

---

## Troubleshooting: Option A

### Issue: "RuntimeError: asyncio.run() in running loop"
**Cause:** Code trying to create new event loop
**Solution:** Use `async/await` instead of `asyncio.run()`

### Issue: "QueuePool limit exceeded"
**Cause:** Too many DB connections from thread pool
**Solution:** Already fixed! Using async SQLAlchemy eliminates threads

### Issue: "Session never marked completed"
**Cause:** Missing `update_session_status('completed')` call
**Solution:** Already fixed in enrichment_worker.py

### Issue: "Progress counter stops at 45/100"
**Cause:** Race condition from multiple threads
**Solution:** Already fixed! Single async task, no threads

### Issue: "TMDB returns 429 (rate limit)"
**Cause:** Batches sent too fast
**Solution:** Already fixed! 2.5s delays between batches

---

## Next: Option C Tomorrow

Tomorrow, you'll work on Option C using the same approach:
- Start with `C:\Users\maria\Desktop\---\letterboxd-stats-ok`
- Read `OPTION_C_ARCHITECTURE.md` (much simpler!)
- Implement using `OPTION_C_IMPLEMENTATION.md`

**Option C is simpler** (~500 lines vs 2,388 in broken version) but **no database**.

---

## Questions During Implementation?

1. **Re-read the relevant section** in `OPTION_A_ARCHITECTURE.md`
2. **Check the code comment** in `OPTION_A_IMPLEMENTATION.md`
3. **Look at test examples** in `OPTION_A_TESTING.md`
4. **Review debug guide** in `OPTION_A_DEBUGGING.md`

---

## Success Criteria

You'll know Phase 3 (Services) is working when:
- [ ] `tmdb_client.enrich_movie()` enriches 10 movies in <5 seconds
- [ ] `enrichment_worker.enrich_session()` completes 100 movies in 30 seconds
- [ ] No crashes, no hanging, clean logs
- [ ] Progress counter always accurate (no lost updates)

You'll know the full implementation works when:
- [ ] `pytest tests/ -v` - all tests pass
- [ ] Upload 100 movies, see progress bar
- [ ] Results returned when complete
- [ ] No errors, no memory leaks

---

## Let's Begin!

Ready to start? Begin with **OPTION_A_ARCHITECTURE.md** - 20 minutes to understand the approach, then jump into implementation!

