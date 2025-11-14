# Enrichment Job Not Starting - Root Cause & Fix

## Problem
After uploading CSV files, the enrichment job status was stuck at "processing" and never changed to "enriching". The APScheduler warning appeared:
```
WARNI [apscheduler.scheduler] Execution of job "TMDB Enrichment Job" skipped: maximum number of running instances reached (1)
```

The enrichment worker couldn't find any sessions to enrich even though the upload endpoint set the status to `'enriching'`.

---

## Root Cause: Database Session Isolation

SQLAlchemy sessions are **isolated from each other**. The issue was:

1. **In `main.py`** (startup): A single global database session was created:
   ```python
   db = SessionLocal()  # Global session created once at startup
   storage = StorageService(db)  # Enrichment worker uses this session
   ```

2. **In `upload.py`** (request handler): Each upload request gets a **different** session via FastAPI dependency injection:
   ```python
   async def upload_csv(files: List[UploadFile], db: Session = Depends(get_db)):
       storage = StorageService(db)  # Different session instance
       storage.update_session_status(session_id, "enriching")  # Commits here
   ```

3. **The Problem**:
   - Upload endpoint's session commits `status='enriching'` to the database
   - But the enrichment worker's global session doesn't see this change
   - When `get_enriching_sessions()` queries the stale global session, it returns no results
   - Enrichment job has nothing to do, so it exits immediately

---

## Solution: Use Session Factory Pattern

Instead of passing a single session instance to the enrichment worker, pass the `SessionLocal` factory:

### Changes Made:

#### 1. **`backend/main.py`** (line 76-85)
**Before:**
```python
db = SessionLocal()
storage = StorageService(db)
enrichment_worker = EnrichmentWorker(tmdb_client, storage)
```

**After:**
```python
# Pass SessionLocal factory instead of single session
# This allows creating fresh sessions for each polling cycle
enrichment_worker = EnrichmentWorker(tmdb_client, SessionLocal)
```

#### 2. **`backend/app/services/enrichment_worker.py`**

**Constructor** (line 51-64):
```python
def __init__(self, tmdb_client: TMDBClient, db_session_factory):
    """
    Args:
        db_session_factory: SQLAlchemy SessionLocal factory
                           This allows creating fresh sessions for each polling cycle
    """
    self.tmdb_client = tmdb_client
    self.db_session_factory = db_session_factory  # Store factory instead of session
    self.scheduler = BackgroundScheduler()
```

**enrich_sessions method** (line 140-175):
```python
def enrich_sessions(self) -> None:
    # Create a FRESH session for this polling cycle
    db = self.db_session_factory()

    try:
        storage = StorageService(db)
        sessions = storage.get_enriching_sessions()  # Now sees latest data
        # ... process sessions ...
    finally:
        db.close()  # Always close the session
```

**enrich_session method** (line 177):
```python
def enrich_session(self, session_id: str, storage: "StorageService") -> None:
    # Now receives storage as parameter instead of using self.storage
    # This ensures it uses the fresh session from enrich_sessions()
```

**force_enrich_session method** (line 347-373):
```python
def force_enrich_session(self, session_id: str) -> None:
    db = self.db_session_factory()
    try:
        storage = StorageService(db)
        self.enrich_session(session_id, storage)
    finally:
        db.close()
```

---

## Why This Works

1. **Every 10 seconds**, the enrichment job runs `enrich_sessions()`
2. **Each execution creates a fresh session** via `db = self.db_session_factory()`
3. **Fresh session sees latest database state** - including status changes from upload requests
4. **`get_enriching_sessions()`** now finds sessions marked as `'enriching'` by the upload endpoint
5. **Enrichment proceeds** and updates progress counter
6. **Session is closed** when the job finishes, preventing connection leaks

---

## Impact

- ✅ Enrichment jobs now start automatically after upload
- ✅ No more stale database state issues
- ✅ Proper database session lifecycle (create → use → close)
- ✅ No connection leaks

---

## Testing

To verify the fix works:

1. Upload CSV files through the analytics page
2. Watch the progress bar appear and update
3. Enrichment should complete within minutes (depending on file size)
4. Analytics charts should appear once enrichment finishes

Check backend logs for:
```
Found 1 session(s) to enrich
Session {session_id}: Enriching 100 movies
Session {session_id}: Enrichment complete
```

---

## Technical Notes

- **Before**: Single stale session → jobs couldn't see new data → no enrichment
- **After**: Fresh sessions per polling cycle → always sees latest data → enrichment works
- This is a standard pattern in async background job systems
- Similar to how FastAPI's `Depends(get_db)` works for request handlers
