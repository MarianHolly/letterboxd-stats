# 🧪 Phase 1 Backend Testing Guide

**Last Updated**: November 12, 2024
**Status**: Ready to Test

---

## Quick Start - Local Testing

### 1. Start Docker Services

```bash
# Navigate to project root
cd letterboxd-stats

# Start PostgreSQL and other services
docker-compose up -d

# Verify PostgreSQL is running
docker-compose ps
```

Expected output:
```
NAME                COMMAND             STATUS
postgres            postgres            Up 2 seconds (healthy)
redis               redis-server        Up 2 seconds
```

### 2. Run Database Migrations

```bash
cd backend

# Run Alembic migrations
alembic upgrade head

# Verify tables created
# You should see: "INFO  [alembic.runtime.migration] Running upgrade  -> 001_initial_schema, done"
```

### 3. Start Backend Server

```bash
cd backend

# Install dependencies (if not done)
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn main:app --reload

# Should see:
# Uvicorn running on http://127.0.0.1:8000
```

Backend is now running at: `http://localhost:8000`

### 4. Test Root Endpoint

```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "message": "Letterboxd Stats API",
  "status": "running"
}
```

---

## API Endpoint Tests

### Test 1: Upload CSV File

**Endpoint**: `POST /api/upload`

**Prerequisites**:
- Have a Letterboxd CSV file (watched.csv, ratings.csv, or diary.csv)
- Or use test data below

**Test with curl**:

```bash
# Using a real CSV file
curl -X POST "http://localhost:8000/api/upload" \
  -F "files=@watched.csv"

# Using multiple files
curl -X POST "http://localhost:8000/api/upload" \
  -F "files=@watched.csv" \
  -F "files=@ratings.csv"
```

**Expected Response** (201 Created):
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enriching",
  "total_movies": 1234,
  "created_at": "2024-11-12T14:23:45.123456"
}
```

**Error Response** (400 Bad Request - no files):
```json
{
  "detail": "No files provided"
}
```

**Save the session_id** - you'll need it for the next tests.

---

### Test 2: Check Session Status

**Endpoint**: `GET /api/session/{session_id}/status`

```bash
# Replace with your session_id from Test 1
SESSION_ID="550e8400-e29b-41d4-a716-446655440000"

curl "http://localhost:8000/api/session/${SESSION_ID}/status"
```

**Expected Response** (200 OK):
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enriching",
  "total_movies": 1234,
  "enriched_count": 0,
  "created_at": "2024-11-12T14:23:45.123456",
  "expires_at": "2024-12-12T14:23:45.123456",
  "error_message": null
}
```

**Status values**:
- `processing` - CSV parsing in progress
- `enriching` - Ready for TMDB enrichment (or waiting)
- `completed` - All done
- `failed` - Error occurred

---

### Test 3: Get Movies List

**Endpoint**: `GET /api/session/{session_id}/movies`

```bash
SESSION_ID="550e8400-e29b-41d4-a716-446655440000"

# Get first 50 movies
curl "http://localhost:8000/api/session/${SESSION_ID}/movies"

# Get page 2 (51-100)
curl "http://localhost:8000/api/session/${SESSION_ID}/movies?page=2&per_page=50"

# Get 100 per page
curl "http://localhost:8000/api/session/${SESSION_ID}/movies?per_page=100"
```

**Expected Response** (200 OK):
```json
{
  "movies": [
    {
      "title": "Inception",
      "year": 2010,
      "rating": 5.0,
      "watched_date": "2023-06-15",
      "rewatch": false,
      "tags": ["sci-fi", "thriller"],
      "review": "Amazing film!",
      "letterboxd_uri": "https://boxd.it/1skk",
      "genres": null,
      "directors": null,
      "cast": null,
      "runtime": null
    }
  ],
  "total": 1234,
  "page": 1,
  "per_page": 50
}
```

---

### Test 4: Get Session Details

**Endpoint**: `GET /api/session/{session_id}`

```bash
SESSION_ID="550e8400-e29b-41d4-a716-446655440000"

curl "http://localhost:8000/api/session/${SESSION_ID}"
```

**Expected Response** (200 OK):
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enriching",
  "total_movies": 1234,
  "enriched_count": 0,
  "created_at": "2024-11-12T14:23:45.123456",
  "expires_at": "2024-12-12T14:23:45.123456",
  "metadata": {
    "files": ["watched.csv", "ratings.csv"]
  }
}
```

---

### Test 5: Invalid Session (404)

**Endpoint**: `GET /api/session/invalid-id/status`

```bash
curl "http://localhost:8000/api/session/invalid-id-12345/status"
```

**Expected Response** (404 Not Found):
```json
{
  "detail": "Session not found or expired"
}
```

---

## Database Verification

### Check Sessions Table

```bash
# Connect to PostgreSQL
docker exec -it letterboxd-stats-postgres-1 psql -U letterboxduser -d letterboxddb

# In psql:
SELECT id, status, total_movies, created_at FROM sessions LIMIT 5;
```

Expected output:
```
                   id                   |  status  | total_movies |         created_at
--------------------------------------+----------+--------------+----------------------------
 550e8400-e29b-41d4-a716-446655440000 | enriching |         1234 | 2024-11-12 14:23:45.123456
```

### Check Movies Table

```sql
-- In psql:
SELECT id, title, year, rating, letterboxd_uri FROM movies LIMIT 5;
```

Expected output:
```
 id |      title       | year | rating |     letterboxd_uri
----+------------------+------+--------+---------------------
  1 | Inception        | 2010 |    5.0 | https://boxd.it/1skk
  2 | The Dark Knight  | 2008 |    5.0 | https://boxd.it/2abc
```

### Count Movies

```sql
-- In psql:
SELECT COUNT(*) FROM movies WHERE session_id = '550e8400-e29b-41d4-a716-446655440000';
```

Should match `total_movies` from session.

---

## Postman Testing

### Import Postman Collection

1. Open Postman
2. Click "Import"
3. Create these requests:

#### Request 1: Upload CSV
```
POST http://localhost:8000/api/upload
Body: form-data
- Key: "files" (type: File)
- Value: [select your CSV file]
```

#### Request 2: Check Status
```
GET http://localhost:8000/api/session/{{session_id}}/status

Environment variable:
- session_id: [paste from upload response]
```

#### Request 3: Get Movies
```
GET http://localhost:8000/api/session/{{session_id}}/movies?page=1&per_page=50
```

#### Request 4: Get Details
```
GET http://localhost:8000/api/session/{{session_id}}
```

---

## Performance Testing

### Test 1: Large File Upload (1000+ movies)

```bash
# Time the upload
time curl -X POST "http://localhost:8000/api/upload" \
  -F "files=@large-watched.csv"
```

**Expected**: < 2 seconds for 1000 movies

### Test 2: Movie Retrieval Speed

```bash
# Time getting all movies
time curl "http://localhost:8000/api/session/${SESSION_ID}/movies?per_page=1000"
```

**Expected**: < 500ms response time

### Test 3: Database Query Performance

```sql
-- In psql:
EXPLAIN ANALYZE
SELECT * FROM movies WHERE session_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY watched_date DESC LIMIT 50;
```

Should use index and be < 10ms.

---

## Error Handling Tests

### Test 1: No Files Provided

```bash
curl -X POST "http://localhost:8000/api/upload"
```

Expected: 400 Bad Request - "No files provided"

### Test 2: Invalid File Type

```bash
# Create a .txt file
echo "test" > test.txt

curl -X POST "http://localhost:8000/api/upload" \
  -F "files=@test.txt"
```

Expected: 400 Bad Request - "Invalid file type"

### Test 3: Expired Session (30 days)

```bash
# Sessions expire after 30 days
# Manually update database:
UPDATE sessions SET expires_at = NOW() - INTERVAL '1 day'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

# Try to get movies
curl "http://localhost:8000/api/session/${SESSION_ID}/movies"
```

Expected: 404 Not Found

---

## Frontend Integration Tests

### Test 1: Start Frontend

```bash
cd frontend
npm run dev

# Should be available at http://localhost:3000
```

### Test 2: Upload via UI

1. Navigate to http://localhost:3000
2. Click "Upload CSV"
3. Select a CSV file
4. Click "Upload"
5. Should see "Processing..." message
6. Eventually should show "Ready to view"

### Test 3: View Results

1. After upload completes
2. Should redirect to `/stats/{session_id}`
3. Should display:
   - Movie count
   - Average rating
   - Year range
   - Charts (if implemented)

---

## Debugging Tips

### Check Backend Logs

```bash
# If running in terminal, you'll see logs like:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     Application startup complete
# INFO:     POST /api/upload - 201 Created
```

### Check Database Logs

```bash
docker logs letterboxd-stats-postgres-1
```

### Enable SQL Logging

In `app/db/session.py`, add:

```python
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

### Test with Real Letterboxd Data

1. Go to https://letterboxd.com/settings/import-export/
2. Click "Export Your Data"
3. Download ZIP with CSVs
4. Extract watched.csv, ratings.csv, diary.csv
5. Upload to API

---

## Checklist - Everything Works

- [ ] Docker services running (postgres, redis)
- [ ] Migrations applied (alembic upgrade head)
- [ ] Backend server running
- [ ] `GET /` returns status running
- [ ] Can upload watched.csv and get session_id
- [ ] `GET /api/session/{id}/status` returns status
- [ ] `GET /api/session/{id}/movies` returns movie list
- [ ] Can upload multiple files (watched + ratings)
- [ ] Database has sessions and movies
- [ ] Frontend loads and shows upload modal
- [ ] Can upload via frontend
- [ ] Frontend receives session_id
- [ ] Error handling works (404 for invalid sessions)
- [ ] Performance is < 2 seconds for 1000 movies

---

## Cleanup & Reset

### Delete All Sessions (start fresh)

```bash
# In psql:
TRUNCATE movies CASCADE;
TRUNCATE sessions CASCADE;
```

### Stop Services

```bash
docker-compose down
```

### Full Reset

```bash
# Stop services
docker-compose down

# Remove volume (delete database)
docker volume rm letterboxd-stats_postgres_data

# Restart
docker-compose up -d
alembic upgrade head
```

---

## Common Issues

### Issue: "Database connection refused"

**Solution**:
```bash
# Ensure PostgreSQL is running
docker-compose ps

# If not running
docker-compose up -d

# Check logs
docker logs letterboxd-stats-postgres-1
```

### Issue: "TABLE sessions does not exist"

**Solution**:
```bash
# Run migrations
cd backend
alembic upgrade head
```

### Issue: "Session not found" (404)

**Possible causes**:
- Session ID is wrong - copy exactly from upload response
- Session expired (30 days)
- Session ID in URL doesn't match (typo)

### Issue: Upload returns empty CSV error

**Solution**:
- Verify CSV has "Name" column
- Verify CSV has "Letterboxd URI" column
- For diary.csv: verify "Watched Date" column exists

### Issue: Slow response times

**Debugging**:
```bash
# Check if indexes exist
docker exec -it letterboxd-stats-postgres-1 psql -U letterboxduser -d letterboxddb

# In psql:
\d movies
\d sessions
```

Should see indexes on `session_id`, `letterboxd_uri`, `expires_at`.

---

## Next Steps After Testing

If all tests pass:

1. **Frontend Integration** → Connect upload modal to real API
2. **Session Polling** → Implement status checker
3. **TMDB Enrichment** (Phase 2) → Add movie metadata
4. **Analytics** (Phase 2) → Implement charts

---

**Ready to test!** Run the Quick Start section above and report any issues.
