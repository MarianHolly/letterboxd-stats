# Backend Foundation - Quick Reference Guide

## 📊 Overview

**Goal:** Build session-based backend that processes CSV uploads, stores data in PostgreSQL, and enriches with TMDB metadata.

**Duration:** 8-12 hours (focused work) or 2-3 days (part-time)

**Core Components:**
- Database layer (PostgreSQL + SQLAlchemy)
- CSV parsing service
- Upload API endpoint
- Storage service
- Session management

---

## 🎯 Phase Breakdown

### Phase 1.1: Database Setup (2-3 hours)
**Deliverable:** PostgreSQL database with tables, migrations, and connection handling

### Phase 1.2: CSV Parser (2-3 hours)
**Deliverable:** Service that parses Letterboxd CSVs into structured data

### Phase 1.3: Upload & Storage (3-4 hours)
**Deliverable:** API endpoint that accepts files, generates sessions, stores data

### Phase 1.4: Session Management (1-2 hours)
**Deliverable:** Endpoints to check session status and retrieve data

---

## ✅ Task Checklist

### Task 1: Database Models & Migrations

**What it does:**
- Defines database tables (sessions, movies)
- Creates relationships between tables
- Sets up auto-expiry and timestamps
- Handles database connection pooling

**Components created:**
- `app/models/database.py` - SQLAlchemy models
- `app/db/session.py` - Database connection
- `alembic/versions/` - Migration files

**Key functionality:**
- Sessions table stores metadata (UUID, timestamps, status)
- Movies table stores parsed CSV data + TMDB fields
- Foreign key relationship (movies → sessions)
- Auto-delete expired sessions via cascade

**Success criteria:**
- [ ] Can connect to PostgreSQL
- [ ] Tables exist in database
- [ ] Can create/read sessions
- [ ] Can create/read movies

---

### Task 2: CSV Parser Service

**What it does:**
- Reads uploaded CSV files
- Validates required columns exist
- Parses dates, ratings, and metadata
- Merges data from multiple files (watched/ratings/diary)
- Returns clean, structured Python dictionaries

**Components created:**
- `app/services/csv_parser.py` - Main parser class

**Key functionality:**
- Three parsing methods: `parse_watched()`, `parse_ratings()`, `parse_diary()`
- Merge logic: diary > ratings > watched (priority order)
- Date parsing with multiple formats
- Rating normalization (half-stars to 0.5 increments)
- Rewatch detection

**Success criteria:**
- [ ] Can parse watched.csv correctly
- [ ] Can parse ratings.csv correctly
- [ ] Can parse diary.csv correctly
- [ ] Merge logic works (diary overwrites ratings)
- [ ] Handles missing columns gracefully

---

### Task 3: Storage Service

**What it does:**
- Takes parsed CSV data (Python dicts)
- Stores movies in database
- Updates session metadata
- Handles bulk inserts efficiently
- Retrieves session and movie data

**Components created:**
- `app/services/storage.py` - Storage operations class

**Key functionality:**
- `store_movies()` - Bulk insert movies for a session
- `get_session()` - Retrieve session by UUID
- `get_movies()` - Get all movies for a session
- `update_session_status()` - Change processing status
- Transaction management (commit/rollback)

**Success criteria:**
- [ ] Can store 100+ movies in under 1 second
- [ ] Session metadata updates correctly
- [ ] Can retrieve movies by session_id
- [ ] Handles database errors gracefully

---

### Task 4: Upload API Endpoint

**What it does:**
- Accepts file uploads (multipart/form-data)
- Generates unique session UUID
- Creates session record in database
- Parses uploaded CSV files
- Stores movies in database
- Returns session_id to frontend

**Components created:**
- `app/api/upload.py` - Upload route handler
- `app/schemas/upload.py` - Request/response models

**Key functionality:**
- POST `/api/upload` endpoint
- File validation (type, size, columns)
- Session creation with status 'processing'
- Parallel CSV parsing (if multiple files)
- Error handling with proper HTTP codes

**Success criteria:**
- [ ] Can upload single CSV file
- [ ] Can upload multiple CSV files
- [ ] Returns valid session_id
- [ ] Session created in database
- [ ] Movies stored correctly
- [ ] Proper error messages on failure

---

### Task 5: Session Management Endpoints

**What it does:**
- Check session processing status
- Retrieve session metadata
- Get movies for a session
- Provide data for frontend polling

**Components created:**
- `app/api/session.py` - Session routes
- `app/schemas/session.py` - Response models

**Key functionality:**
- GET `/api/session/{session_id}/status` - Check processing state
- GET `/api/session/{session_id}/movies` - List all movies
- GET `/api/session/{session_id}` - Full session details
- Status values: processing, enriching, completed, failed

**Success criteria:**
- [ ] Can check session status
- [ ] Returns accurate processing state
- [ ] Can retrieve movie list
- [ ] Handles invalid session_id

---

## 📐 Data Flow

```
Frontend Upload
    ↓
POST /api/upload (files)
    ↓
1. Generate session_id (UUID)
2. Create session record (status='processing')
3. Parse CSV files → Python dicts
4. Store movies in database
5. Update session (status='enriching', total_movies=N)
    ↓
Return {session_id, status, total_movies}
    ↓
Frontend polls GET /api/session/{id}/status
    ↓
Returns {status, progress, total_movies}
```

---

## 🏗️ Architecture Summary

**Database Layer:**
- PostgreSQL 15 with SQLAlchemy ORM
- Two tables: sessions, movies
- Cascade delete (session → movies)
- JSONB for flexible metadata

**Service Layer:**
- CSVParser: File parsing logic
- StorageService: Database operations
- TMDBClient: (Phase 2) External API calls

**API Layer:**
- FastAPI routes with Pydantic validation
- Dependency injection for database
- Async file handling
- Error handling middleware

---

## 🔍 Component Relationships

```
Upload Endpoint
    ↓ uses
CSVParser Service
    ↓ returns parsed data
Storage Service
    ↓ stores in
PostgreSQL Database
    ↑ queries
Session Endpoints
```

---

## 🎯 Success Metrics

**After Phase 1 completion:**
- [ ] Can upload CSV files via API
- [ ] Session created with unique UUID
- [ ] Movies stored in PostgreSQL
- [ ] Can retrieve session status
- [ ] Can list movies for session
- [ ] Database handles 1000+ movies
- [ ] Upload completes in < 2 seconds

---

## 📋 File Structure Created

```
backend/
├── app/
│   ├── models/
│   │   └── database.py          ✅ SQLAlchemy models
│   ├── db/
│   │   └── session.py           ✅ DB connection
│   ├── services/
│   │   ├── csv_parser.py        ✅ CSV parsing logic
│   │   └── storage.py           ✅ Database operations
│   ├── api/
│   │   ├── upload.py            ✅ Upload endpoint
│   │   └── session.py           ✅ Session endpoints
│   └── schemas/
│       ├── upload.py            ✅ Request/response models
│       └── session.py           ✅ Session models
└── alembic/
    └── versions/
        └── 001_initial.py       ✅ Initial migration
```

---

## ⚡ Quick Commands

```bash
# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Run migrations
alembic upgrade head

# Start FastAPI dev server
uvicorn app.main:app --reload

# Test upload endpoint
curl -X POST http://localhost:8000/api/upload \
  -F "files=@watched.csv"

# Check session status
curl http://localhost:8000/api/session/{uuid}/status
```

---

## 🔄 Next Phase Preview

**Phase 2: TMDB Integration**
- Build TMDB API client
- Implement background enrichment task
- Update movies with metadata
- Track enrichment progress

**Connection point:** After Phase 1, you can trigger TMDB enrichment as background task from upload endpoint.

---

## 📌 Important Notes

- **No authentication** in this phase (session-based only)
- **No TMDB enrichment** yet (Phase 2)
- **No analytics computation** yet (Phase 3)
- Focus: Upload → Parse → Store → Retrieve

---

**Ready to start?** Open BACKEND_FOUNDATION_IMPLEMENTATION_GUIDE.md for detailed implementation steps.
