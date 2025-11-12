# Quick Start Guide - Windows

## Backend Setup (Windows-specific)

### 1. Start PostgreSQL with Docker

```bash
cd C:\Users\maria\Documents\GitHub\letterboxd-stats

# Start Docker services
docker-compose up -d

# Verify PostgreSQL is running
docker-compose ps
```

Expected output:
```
STATUS
Up 30 seconds (healthy)
```

### 2. Run Migrations

In `backend` directory:

```bash
cd backend

# Check migration status
python -m alembic current

# Check history
python -m alembic history

# If not applied yet, run upgrade
python -m alembic upgrade head
```

**Note**: If you see "relation 'sessions' already exists", migrations are already applied - this is fine!

### 3. Start Backend Server (Windows)

```bash
cd backend

# WITHOUT reload (better on Windows)
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --no-access-log

# OR with reload (if needed, but may have issues)
# python -m uvicorn main:app --reload
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

Backend is running at: `http://localhost:8000`

### 4. Test Backend (Quick Test)

Open PowerShell/Command Prompt and run:

```powershell
# Test root endpoint
curl http://localhost:8000/

# Should return:
# {"message":"Letterboxd Stats API","status":"running"}
```

Or use Python test client:

```bash
python -c "
from main import app
from fastapi.testclient import TestClient
client = TestClient(app)
resp = client.get('/')
print(resp.json())
"
```

---

## Frontend Setup (Windows)

### 1. Start Frontend

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Expected output:
```
Local:        http://localhost:3000
```

### 2. Test Frontend

- Navigate to `http://localhost:3000`
- Should see landing page
- React hook error should be FIXED!

---

## Full Stack Test (End-to-End)

### 1. Create Test CSV

Create `test-movies.csv` in any folder:

```csv
Name,Year,Watched Date,Letterboxd URI,Rating
Inception,2010,2023-06-15,https://boxd.it/1skk,5
The Dark Knight,2008,2023-07-20,https://boxd.it/2abc,5
Pulp Fiction,1994,2023-08-10,https://boxd.it/3def,4
```

### 2. Test Upload API

```powershell
# Using curl (Windows)
curl -X POST "http://localhost:8000/api/upload" `
  -F "files=@C:\path\to\test-movies.csv"

# Should return:
# {
#   "session_id": "some-uuid-here",
#   "status": "enriching",
#   "total_movies": 3,
#   "created_at": "2024-11-12T14:23:45.123456"
# }
```

### 3. Check Session

```powershell
# Save the session_id from above
$SESSION_ID = "your-session-id-here"

# Check status
curl "http://localhost:8000/api/session/$SESSION_ID/status"

# Get movies
curl "http://localhost:8000/api/session/$SESSION_ID/movies"
```

### 4. Connect Frontend to Backend

In `frontend/.env.local` (create if doesn't exist):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Update `frontend/lib/api.ts` to use this URL:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
```

---

## Troubleshooting (Windows)

### Issue: "alembic: The term 'alembic' is not recognized"

**Solution**: Use Python module instead:
```bash
python -m alembic upgrade head
# NOT: alembic upgrade head
```

### Issue: "relation 'sessions' already exists"

**Solution**: This is fine! It means migrations were already applied.

### Issue: Connection timeout to database

**Solution**:
1. Check Docker is running: `docker-compose ps`
2. Verify PostgreSQL started: `docker logs letterboxd-stats-postgres-1`
3. Check DATABASE_URL in `.env`: `postgresql://letterboxduser:securepassword@localhost:5432/letterboxddb`

### Issue: Backend won't start with --reload

**Solution**: Use without reload on Windows:
```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### Issue: "Cannot find module" errors in frontend

**Solution**:
```bash
cd frontend
npm install
npm run dev
```

### Issue: React hook errors in frontend

**Solution**: Already fixed! Restart npm dev server:
```bash
cd frontend
npm run dev
```

---

## Running Everything at Once

### Terminal 1 - Backend

```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

### Terminal 3 - Test/Development

```bash
# Test uploads, check API, etc.
curl http://localhost:8000/
```

---

## Environment Files

Make sure these exist in project root and `backend/`:

**`.env` (project root)**
```
TMDB_API_KEY=your_key_here
TMDB_API_TOKEN=your_token_here
DATABASE_URL=postgresql://letterboxduser:securepassword@localhost:5432/letterboxddb
```

**`backend/.env`** (same content)
```
DATABASE_URL=postgresql://letterboxduser:securepassword@localhost:5432/letterboxddb
TMDB_API_KEY=your_key_here
```

---

## Docker Compose Quick Reference

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f postgres

# Connect to database
docker exec -it letterboxd-stats-postgres-1 psql -U letterboxduser -d letterboxddb

# Reset database
docker-compose down
docker volume rm letterboxd-stats_postgres_data
docker-compose up -d
```

---

## Ports

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis** (if used): localhost:6379

---

**Next Steps**: Follow `TESTING_GUIDE_PHASE1.md` for comprehensive API testing!
