# 🔧 Debugging Guide: Data Not Displaying After Upload

## Summary

I've identified and fixed **5 critical issues** preventing data from displaying after CSV upload. All fixes have been applied.

---

## Issues Found & Fixed

### ✅ Issue 1: Missing Column Validation
**Problem:** Backend didn't validate if CSV had required columns ('Watched Date', 'Name')
- Caused silent failures when wrong CSV was uploaded
- No error feedback to user

**Fixed In:** `backend/main.py:48-60`
- Added validation for required columns
- Returns clear error message if columns missing
- Logs available columns for debugging

---

### ✅ Issue 2: Missing TMDB API Key
**Problem:** `TMDB_API_KEY` environment variable not passed to backend container
- Backend tried to use `None` value
- TMDB enrichment silently failed

**Fixed In:** `docker-compose.yml:28`
- Changed: `TMDB_API_KEY: ${TMDB_API_KEY}`
- Now reads from your `.env` file

**Action Required:** Ensure your `.env` file has:
```
TMDB_API_KEY=your_actual_api_key_here
```

---

### ✅ Issue 3: Incomplete Error Responses
**Problem:** When TMDB lookup failed, response was missing fields (tmdb_title, tmdb_rating, release_date)
- Frontend expected all fields, got some as undefined
- Frontend crashed or displayed incomplete data

**Fixed In:** `backend/main.py:77-87, 119-125`
- All responses now have complete field structure
- Missing fields default to `null` (not `undefined`)
- Backend gracefully degrades - returns data without TMDB if API fails

---

### ✅ Issue 4: No Error Logging/Feedback
**Problem:** Errors silently failed with zero visibility
- CSV parsing errors → blank response
- TMDB API errors → incomplete response
- Network timeout → generic error

**Fixed In:** `backend/main.py:10-27, 135-146`
- Added comprehensive logging
- Better error messages returned to frontend
- Status codes properly set (400 for bad CSV, 500 for server error)

---

### ✅ Issue 5: Type Mismatches in Frontend
**Problem:** Frontend type definitions were too strict
- Expected all fields to be non-null
- Didn't handle missing/null values gracefully

**Fixed In:** `frontend/app/page.tsx:5-16, 49-61, 139-180`
- Updated TypeScript interface to allow null values
- Added optional rendering blocks for fields
- Better error handling in fetch response
- Shows TMDB rating when available

---

### Bonus: Docker Typo Fixed
**Problem:** `docker-compose.yml:35` had `--post 8000` instead of `--port 8000`

**Fixed In:** `docker-compose.yml:36`
- Changed to correct flag: `--port 8000`

---

## How to Test the Fixes

### Step 1: Update Environment
Make sure `.env` in project root has:
```
TMDB_API_KEY=your_actual_tmdb_api_key
```

Get your key from: https://www.themoviedb.org/settings/api

### Step 2: Rebuild Docker
```bash
cd C:\Users\maria\Documents\GitHub\letterboxd-stats
docker-compose down
docker-compose up --build
```

### Step 3: Test Upload
1. Go to `http://localhost:3000`
2. Upload your `diary.csv` file
3. Wait for processing
4. Check if movie displays with poster, overview, TMDB rating

### Step 4: Monitor Backend Logs
While uploading, watch the backend logs:
```bash
docker logs letterboxd_stats_backend -f
```

You should see:
```
INFO: CSV loaded. Columns: ['Name', 'Year', 'Watched Date', 'Rating', ...]
INFO: Processing movie: [Movie Title] ([Year])
INFO: Successfully enriched with TMDB data
```

---

## Debugging Checklist

If data still doesn't display after fixes:

### 1. **Check Backend Logs**
```bash
docker logs letterboxd_stats_backend
```
Look for:
- `CSV loaded` - CSV parsing worked
- `Processing movie` - Which movie was extracted
- `Successfully enriched` - TMDB lookup worked
- `error` messages - What went wrong

### 2. **Check Browser Console**
Press `F12` in browser, go to Console tab
Look for:
- Network errors (red messages)
- Specific error responses from backend

### 3. **Verify CSV Format**
Your CSV must have these columns (case-sensitive):
- `Name` - Movie title
- `Year` - Release year
- `Watched Date` - When you watched it
- `Rating` (optional) - Your rating

If uploading wrong CSV type, backend will tell you which columns are found vs. expected.

### 4. **Test Backend Directly**
Use Postman or curl to test:
```bash
# Get health check
curl http://localhost:8000/

# Upload file (replace path)
curl -X POST -F "file=@path/to/diary.csv" http://localhost:8000/upload
```

Should return JSON with movie data.

### 5. **Check TMDB API Key**
```bash
# Verify key is set in backend
docker exec letterboxd_stats_backend env | grep TMDB
```

If not set, key won't show up - means `.env` not read properly.

---

## What Each Fix Does

### Backend Changes Summary

**Added Error Handling:**
- Validates CSV columns before processing
- Returns proper HTTP status codes (400 for bad input, 500 for server error)
- Returns detailed error messages

**Added Logging:**
- Logs CSV column names (helps debug format issues)
- Logs which movie being processed
- Logs success/failure of TMDB lookup
- Logs network/API errors

**Made API Graceful:**
- If TMDB API fails, still returns CSV data
- If TMDB key missing, returns data without enrichment
- All responses have consistent structure

**Fixed TMDB Integration:**
- Uses TMDB_API_KEY from environment
- Proper error handling for API timeouts
- Better movie matching with year parameter

### Frontend Changes Summary

**Better Type Safety:**
- All optional fields properly typed as `null`
- Interface matches backend response

**Better Error Display:**
- Catches and displays error messages from backend
- Shows helpful error for connection issues
- Logs errors to browser console for debugging

**Better Rendering:**
- Only shows fields that have data
- Handles null/undefined safely
- Shows TMDB rating when available

---

## Common Issues After Applying Fixes

### "Still no data displayed"

**Likely Cause 1: TMDB API Key not set**
```bash
# Check if .env file exists and has key
cat .env
# Should show: TMDB_API_KEY=sk-...
```

**Likely Cause 2: Wrong CSV uploaded**
Check backend logs - it will tell you which columns it found.
Your CSV must have exactly: `Name`, `Year`, `Watched Date`, `Rating`

**Likely Cause 3: Backend not restarted**
```bash
docker-compose down
docker-compose up --build
```

### "Error: Failed to upload file"
- Backend not running: Start with `docker-compose up`
- Wrong file format: Upload `.csv` file
- File too large: Letterboxd CSVs are usually <10MB

### "Backend logs show 'TMDB_API_KEY not set'"
Your `.env` file isn't being read by Docker.
- Check `.env` exists in project root
- Verify format: `TMDB_API_KEY=your_key` (no quotes)
- Restart: `docker-compose down && docker-compose up --build`

---

## Files Modified

1. **backend/main.py** - Added error handling, logging, graceful degradation
2. **docker-compose.yml** - Fixed port flag, added TMDB_API_KEY env var
3. **frontend/app/page.tsx** - Fixed types, error handling, conditional rendering

---

## Next Steps

### Immediate (Required for functionality):
1. Set `TMDB_API_KEY` in `.env`
2. Rebuild Docker: `docker-compose up --build`
3. Test upload flow
4. Verify data displays

### Short-term (Improvements):
1. Add database to persist data
2. Show upload progress/spinner
3. Display stats beyond just most recent movie
4. Handle multiple movies, not just the most recent

### Medium-term (Full MVP):
1. Implement the dashboard page (`app/dashboard/page.tsx` is currently empty)
2. Add analytics endpoints per documentation
3. Add TMDB enrichment progress tracking
4. Store results for 30 days

---

## Verification Checklist

After fixes, verify:
- [ ] Backend starts without errors
- [ ] Can upload diary.csv successfully
- [ ] Movie displays with poster image
- [ ] Movie displays with overview text
- [ ] TMDB rating shows (if available)
- [ ] Browser console has no errors
- [ ] Backend logs show success messages

---

## Support

If issues persist:

1. **Check the one-day plan**: `.docs/one_day.md` has architecture details
2. **Test API directly**: Use Postman to test `/upload` endpoint
3. **Review logs**: Both browser console and Docker logs
4. **Verify environment**: Check `.env` file has TMDB API key
5. **Rebuild everything**: `docker-compose down && docker-compose up --build`

The fixes are comprehensive and should resolve all display issues. The main requirement now is having a valid TMDB API key set up properly.
