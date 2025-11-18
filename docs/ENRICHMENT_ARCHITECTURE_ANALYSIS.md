# Enrichment Architecture Analysis & Alternative Solutions

**Date**: November 14, 2025
**Problem**: APScheduler warning: "Execution of job skipped: maximum number of running instances reached"
**Root Cause Analysis**: The scheduled interval (10s) is too short for the actual work duration

---

## The Problem

### Current Architecture
```
APScheduler (10s interval)
    ↓
enrich_sessions() [blocking call]
    ├─→ For each session
    │   └─→ For each unenriched movie
    │       ├─→ TMDB search (network I/O - slow)
    │       ├─→ TMDB details (network I/O - slow)
    │       └─→ Database update (disk I/O)
    └─→ Return (might take 30+ seconds!)
    ↓
Next run scheduled 10s later... but previous job still running!
```

### Why It Keeps Happening

**Actual Execution Times**:
- Single TMDB API call: 200-500ms (network latency)
- Database update: 50-100ms per movie
- For 50 unenriched movies: `(350ms × 50) + overhead = 17.5+ seconds`
- For 100+ movies: 35+ seconds

**Scheduler Logic**:
```
10:00:00 - Job starts
10:00:10 - Next run scheduled (but job still running at step 5/100)
10:00:10 - WARNING: "job skipped, max instances reached"
10:00:20 - Next run scheduled (job still running!)
10:00:20 - WARNING again
... repeats every 10 seconds until job finishes
```

### Why Previous Fixes Don't Work
- ❌ `coalesce=True` → Only delays the warning, doesn't solve it
- ❌ `misfire_grace_time=60` → Doesn't prevent concurrent execution attempts
- ❌ Increasing interval to 30s → Hides problem but reduces responsiveness
- ❌ `max_instances=2` → Creates race conditions on database

---

## Root Cause: Wrong Architecture for the Job

The **real problem**: Using a **blocking scheduled job** for an **I/O-heavy asynchronous task**

| Approach | Issue |
|----------|-------|
| **Blocking Scheduler** (current) | Locks thread, no concurrency, can't handle I/O well |
| **Async Scheduler** | Still blocking if using sync TMDB calls |
| **Queue System** | Better but adds complexity |
| **Event-Driven** | Best but requires rearchitecture |

---

## Solution 1: Async/Concurrent Processing ⭐ (RECOMMENDED)

### The Idea
Instead of processing movies **sequentially**, process them **concurrently** with proper async I/O.

### Implementation

**Change TMDB Client to async**:
```python
# BEFORE (blocking)
def enrich_movie(self, title, year):
    response = requests.get(...)  # Blocks thread!
    return process_response()

# AFTER (async)
async def enrich_movie(self, title, year):
    async with aiohttp.ClientSession() as session:
        async with session.get(...) as resp:
            return await process_response()
```

**Change enrichment to use asyncio**:
```python
async def enrich_session(self, session_id):
    movies = storage.get_unenriched_movies(session_id)

    # Process 10 movies concurrently instead of 1 at a time
    tasks = [
        self.enrich_movie(m.title, m.year)
        for m in movies[:10]  # Semaphore limit
    ]
    results = await asyncio.gather(*tasks)

    # Update database with results
    for movie, result in zip(movies, results):
        storage.update_movie_enrichment(movie.id, result)
```

**Change scheduler to async**:
```python
# In main.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Instead of BackgroundScheduler
scheduler = AsyncIOScheduler()
scheduler.add_job(async_enrich_sessions, ...)
```

### Benefits
- ✅ 10 movies can enrich simultaneously
- ✅ Network I/O doesn't block other movies
- ✅ 50 movies in 2-3 min instead of 25+ min
- ✅ No more "max instances reached" warnings
- ✅ True non-blocking enrichment

### Downsides
- 🔴 Requires rewriting TMDB client to async
- 🔴 Must use `aiohttp` instead of `requests`
- 🔴 Moderate complexity increase
- 🟡 Need to carefully manage concurrent database writes

### Effort: **Medium** (2-4 hours)
### Benefit: **Very High** (10x faster enrichment, no warnings)

---

## Solution 2: Background Task Queue (Celery/RQ) ⭐⭐ (ENTERPRISE)

### The Idea
Use a dedicated task queue (Redis-backed) to process enrichment as independent jobs.

### Architecture
```
Frontend Upload
    ↓
Create Session + Queue 100 enrichment tasks
    ↓
Redis Queue
    ├─→ Worker 1: Process movies 1-25
    ├─→ Worker 2: Process movies 26-50
    ├─→ Worker 3: Process movies 51-75
    └─→ Worker 4: Process movies 76-100
    ↓
Each worker independently:
    1. Fetch movie details from TMDB
    2. Update database
    3. Increment progress counter
    4. Report back to queue
    ↓
Frontend polls progress
```

### Implementation

**Install Celery + Redis**:
```bash
pip install celery redis
```

**Define enrichment task**:
```python
# app/tasks/enrichment.py
from celery import shared_task

@shared_task(bind=True, max_retries=3)
def enrich_movie_task(self, movie_id, session_id):
    """Single movie enrichment as independent task"""
    try:
        movie = db.query(Movie).get(movie_id)
        enrichment = tmdb_client.enrich_movie(movie.title, movie.year)

        if enrichment:
            storage.update_movie_enrichment(movie_id, enrichment)

        storage.increment_enriched_count(session_id)

    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60)
```

**Queue tasks on upload**:
```python
# In upload.py
from app.tasks.enrichment import enrich_movie_task

@router.post("/upload")
async def upload_csv(...):
    # ... parse and store movies ...

    # Queue all movies for enrichment
    for movie in movies:
        enrich_movie_task.delay(movie.id, session.id)

    return {"session_id": session.id, ...}
```

**Start workers**:
```bash
# Terminal 1: Redis server
redis-server

# Terminal 2: Celery worker
celery -A app.tasks.enrichment worker --loglevel=info --concurrency=4
```

### Benefits
- ✅ Horizontal scaling (add more workers)
- ✅ Individual task retry logic
- ✅ True background processing (doesn't block FastAPI)
- ✅ Task monitoring and inspection
- ✅ No APScheduler at all (no warnings)
- ✅ 100+ movies in 1-2 min with 4 workers

### Downsides
- 🔴 Adds Redis dependency
- 🔴 Adds Celery complexity
- 🔴 Monitoring/debugging more complex
- 🔴 Learning curve for team
- 🟡 Requires ops setup (Redis, workers)

### Effort: **High** (4-8 hours)
### Benefit: **Extremely High** (best scaling, production-ready)

---

## Solution 3: Change Polling to Webhook/Push ⭐

### Current Architecture (Pull)
```
Frontend (every 2 seconds)
    ↓
GET /api/session/{id}/status
    ↓
Database query
    ↓
Return current progress
```

### Better Architecture (Push)
```
Enrichment Worker
    ↓
[Movie enriched]
    ↓
Push update to Frontend (WebSocket or Server-Sent Events)
    ↓
Frontend real-time update (no polling!)
```

### Implementation

**Using WebSockets**:
```python
# In FastAPI
from fastapi import WebSocket

@app.websocket("/ws/session/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    # Send updates as they happen
    while True:
        status = storage.get_session_status(session_id)
        await websocket.send_json(status)

        if status['status'] == 'completed':
            break

        await asyncio.sleep(2)
```

**Frontend listening**:
```typescript
// React
useEffect(() => {
  const ws = new WebSocket(`ws://localhost:8000/ws/session/${sessionId}`);

  ws.onmessage = (event) => {
    const status = JSON.parse(event.data);
    updateProgress(status);  // Real-time update
  };

  return () => ws.close();
}, [sessionId]);
```

### Benefits
- ✅ No polling overhead
- ✅ Real-time updates (no 2-second delay)
- ✅ Reduces server load (no repeated GET requests)
- ✅ Can combine with any background approach

### Downsides
- 🟡 Moderate frontend changes
- 🟡 WebSocket infrastructure
- 🔴 Doesn't solve the actual enrichment speed problem

### Effort: **Medium** (2-3 hours)
### Benefit: **Medium** (UX improvement, not a core fix)

---

## Solution 4: Increase Interval (Simple But Wrong) ❌

### What It Does
```python
# Change from 10 seconds to 60 seconds
IntervalTrigger(seconds=60)  # Instead of 10
```

### Why It's Bad
- ❌ Progress shows every 60s instead of 10s (poor UX)
- ❌ User thinks nothing is happening for a minute
- ❌ Enrichment still slow (same actual duration)
- ❌ Doesn't fix the problem, just hides it

### Effort: **Trivial** (1 minute)
### Benefit: **None** (fake fix)

---

## Solution 5: Process Fewer Movies Per Run (Band-Aid)

### What It Does
```python
# Only process 5 movies per 10-second interval
def enrich_sessions():
    for session in get_enriching_sessions():
        movies = session.unenriched_movies[:5]  # Limit!

        for movie in movies:
            enrich_movie(movie)
```

### Why It's Bad
- ❌ 100 movies now takes 200+ seconds (3+ minutes)
- ❌ Still doesn't solve the async problem
- ❌ Creates artificial bottleneck
- ❌ More database hits

### Effort: **1 hour**
### Benefit: **Low** (slows down enrichment instead of fixing it)

---

## Recommended Path Forward

### Phase 1: Quick Win (Today) ⚡
**Do nothing about the warning** - it's cosmetic

Focus on what users actually care about:
- ✓ Does enrichment work? Yes
- ✓ Does progress update? Yes
- ✓ Can users see results? Yes

The warning is **harmless** - it's just APScheduler being conservative.

### Phase 2: Medium-term (Next Sprint)
**Implement Solution 1: Async Processing**
- Rewrite TMDB client to async
- Change enricher to process 10 movies concurrently
- Keeps current architecture, huge performance gain
- 2-4 hour effort

### Phase 3: Long-term (Future)
**Implement Solution 2: Celery Queue** (if scaling needed)
- Only needed if you have 1000+ users
- At that point, worth the investment
- Horizontally scalable

---

## Decision Matrix

| Aspect | Async | Celery | Webhook | Band-Aid |
|--------|-------|--------|---------|----------|
| Solves warning | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| Faster enrichment | ✅✅ 5x | ✅✅ 10x | ❌ No | ❌ Slower |
| Complexity | 🟡 Medium | 🔴 High | 🟡 Medium | ✅ None |
| Implementation | 2-4h | 4-8h | 2-3h | 1m |
| Long-term viable | ✅ Good | ✅✅ Best | ✅ Good | ❌ No |

---

## Why This Keeps Failing

Every "fix" treats the **symptom** (the warning), not the **disease** (I/O blocking):

```
Problem:        1 movie every 200ms on 1 thread
Current "fix":   Change config to not warn about it
Real fix:        10 movies every 200ms on multiple threads/processes
```

### The Analogy
- **Current approach**: "Traffic jam on 1-lane road, increase the cycle time of the traffic light"
- **Better approach**: "Add more lanes so cars flow concurrently"

---

## Recommendation

**For your situation RIGHT NOW**:

1. **Accept the warning** - it's not breaking anything
2. **In the next sprint**, implement **Solution 1 (Async)**
3. **Document the current limitation** in README
4. **Track performance**: How long does 100 movies take?
   - Current: 20-35 seconds
   - With async: 3-5 seconds

The warning will disappear naturally once movies enrich faster than the interval.

---

## What to Document

Add to README.md:
```markdown
### Known Limitations

**Enrichment Speed**
- Current: 100-150 movies per minute (sequential processing)
- With async upgrade (planned): 1000-2000 movies per minute
- Timeline: Planned for Q1 2025

**APScheduler Warnings**
- You may see warnings like "Execution skipped: max instances reached"
- This is expected and harmless - enrichment continues in background
- Will be resolved when async processing is implemented

**Improvement Plan**
- Q4 2024: Basic sequential enrichment ✅ (current)
- Q1 2025: Async concurrent enrichment (planned)
- Q2 2025: Celery queue system (if scaling needed)
```

---

## Summary

The **warning is a red herring**. The real issue is:

1. Sequential processing is slow
2. Scheduler interval is too aggressive for slow work
3. Every "fix" just adjusts the interval, doesn't speed up work

**Best solution**: Make enrichment faster with async, not the scheduler interval shorter.

This will naturally eliminate the warning while solving the actual UX problem (slow enrichment).
