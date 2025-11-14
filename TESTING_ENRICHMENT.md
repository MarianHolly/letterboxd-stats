# Testing the Enrichment Fix

## Prerequisites
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:3000`
- TMDB API key set in `.env`: `TMDB_API_KEY=your_key`
- Database initialized and running

---

## Step-by-Step Test

### 1. **Start Backend** (if not already running)
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Watch for this log message (indicates worker started successfully):
```
[OK] Enrichment Worker started
```

### 2. **Check Worker Status**
Visit: `http://localhost:8000/worker/status`

Expected response:
```json
{
  "worker_status": "running",
  "running": true,
  "last_run": null,
  "next_run": "2025-11-14T16:53:42 CET",
  "interval": 10
}
```

### 3. **Upload CSV Files**
1. Go to `http://localhost:3000/analytics`
2. Click "Upload" button
3. Select your CSV files (watched.csv, ratings.csv, etc.)
4. Click "Upload"

### 4. **Expected Behavior** (with the fix)

#### **Immediately after upload:**
- CSV data displays on the page
- Progress bar appears showing "Enriching movies..."
- Counter shows `X of Y movies enriched`

#### **In Backend Logs** (within 10 seconds):
```
Found 1 session(s) to enrich
Session {uuid}: Enriching 100 movies
Enriched: Movie Title (1/100) TMDB ID 12345
Enriched: Another Movie (2/100) TMDB ID 67890
...
Session {uuid}: Enrichment complete
```

#### **In Frontend** (after enrichment completes):
- Progress bar turns green with ✓ checkmark
- Message changes to "✓ Enrichment Complete!"
- Analytics charts appear (Release Year, Diary Patterns, etc.)

---

## Debugging If It Still Doesn't Work

### Check 1: Is Worker Running?
Look for this in startup logs:
```
[OK] Enrichment Worker started
```

If missing, check:
- TMDB_API_KEY environment variable is set
- No exceptions during startup

### Check 2: Is Session Status Being Set?
Add this temporary debug SQL to check database:
```sql
SELECT id, status, total_movies, enriched_count FROM session WHERE status='enriching';
```

If empty, upload failed or status change didn't persist.

### Check 3: Worker Log Output
Set log level to DEBUG in `main.py` line 22:
```python
logging.basicConfig(level=logging.DEBUG)  # Instead of INFO
```

Then watch for detailed logs showing:
- Session queries
- Movie enrichment attempts
- Progress updates

### Check 4: Database Connection
Verify database is accessible:
```bash
psql -U letterboxduser -d letterboxddb -c "SELECT COUNT(*) FROM session;"
```

---

## Expected Timeline (100 movies)

| Time | Event |
|------|-------|
| T+0s | Files uploaded, session created with status='processing' |
| T+0.1s | Upload endpoint sets status='enriching' |
| T+0.2s | Frontend gets session_id, starts polling every 2s |
| T+10s | APScheduler runs, finds enriching session |
| T+10.1s | Enrichment starts, first movies enriched |
| T+12s | Frontend polls: enriched_count = 10 (10%) |
| T+100s | Last movies enriched |
| T+110s | Session marked 'completed', enrichment finishes |
| T+112s | Frontend polls: status='completed' |
| T+114s | Progress bar completes, analytics display |

**Total time: ~2 minutes for 100 movies**

---

## Performance Tips

### If Enrichment is Slow:
- Check TMDB API rate limits (40 requests per 10 seconds)
- Verify internet connection to TMDB
- Check database connection pool isn't exhausted

### If Progress Isn't Showing:
- Make sure frontend polling interval matches backend enrichment speed
- Current: Frontend polls every 2s, enrichment runs every 10s (good)
- Adjust in `frontend/components/dashboard/enrichment-progress.tsx` if needed

### If Jobs Keep Getting Skipped:
- The fix should have resolved this
- If it persists, check for long-running enrichment jobs blocking new ones
- `max_instances=1` means only one enrichment job can run at a time (by design)

---

## Success Indicators

✅ **You'll know it's working when:**

1. Backend logs show: `Found 1 session(s) to enrich`
2. Progress bar appears in frontend within 2 seconds of upload
3. Progress counter increments (1/100, 2/100, etc.)
4. Enrichment completes and status shows "✓ Enrichment Complete!"
5. Analytics charts appear with data from CSV files

❌ **Problems to watch for:**
- Progress bar never appears → session status not being set
- Progress bar stuck at 0% → enrichment not starting
- No backend logs → worker might not be running
- Session expired error → took too long to enrich (> 30 days, unlikely)

---

## Reverting (If Needed)

If you need to revert the fix:
```bash
git revert HEAD
```

This will create a new commit that undoes the changes while preserving git history.
