# Backend Data Flow Architecture - Letterboxd Stats Application

**Created**: November 14, 2025
**Status**: In-depth technical analysis
**Scope**: Database, API endpoints, data transformations, enrichment pipeline

---

## Table of Contents

1. [Overview](#overview)
2. [Core Data Flow Diagram](#core-data-flow-diagram)
3. [Database Architecture](#database-architecture)
4. [Upload Process](#upload-process)
5. [TMDB Enrichment Pipeline](#tmdb-enrichment-pipeline)
6. [API Endpoints](#api-endpoints)
7. [Data Transformations](#data-transformations)
8. [Session Lifecycle](#session-lifecycle)
9. [Frontend Integration Points](#frontend-integration-points)
10. [Proposed Improvements](#proposed-improvements)
11. [Error Handling & Edge Cases](#error-handling--edge-cases)

---

## Overview

The application is a **data ingestion + enrichment system** that transforms Letterboxd CSV exports into a normalized database format and enriches it with TMDB metadata.

### Key Architecture Principles

- **URI-based deduplication**: Letterboxd URIs uniquely identify movies (not title+year)
- **Multi-file merging**: Combine `watched.csv`, `ratings.csv`, `diary.csv`, `likes.csv` into single records
- **Asynchronous enrichment**: TMDB data is fetched in background, frontend polls for progress
- **Session-based isolation**: Each upload is a separate session with 30-day TTL
- **Denormalized progress tracking**: `Session.total_movies` and `enriched_count` cached for fast polling

---

## Core Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LETTERBOXD USER FLOW                              │
└─────────────────────────────────────────────────────────────────────────────────┘

STEP 1: USER EXPORTS DATA FROM LETTERBOXD
  └─→ Generates: watched.csv, ratings.csv, diary.csv, likes.csv (optional)
  └─→ Each file keyed by: [Date, Name, Year, Letterboxd URI]

STEP 2: USER UPLOADS TO APP (FRONTEND → BACKEND)
  ┌──────────────────────────────────────────────────────────────────┐
  │ POST /api/upload (MultipartForm with 1-4 CSV files)             │
  │                                                                   │
  │ Frontend sends:                                                  │
  │  - watched.csv (required)                                        │
  │  - ratings.csv (optional)                                        │
  │  - diary.csv (optional)                                          │
  │  - likes.csv (optional)                                          │
  └──────────────────────────────────────────────────────────────────┘
         ↓
    Backend processes

STEP 3: BACKEND CREATES SESSION
  ┌──────────────────────────────────────────────────────────────────┐
  │ StorageService.create_session()                                  │
  │  └─→ Generates: UUID session_id                                 │
  │  └─→ Sets: status='processing', total_movies=0, enriched_count=0│
  │  └─→ Sets: expires_at = now + 30 days                           │
  │  └─→ Stores: upload_metadata = {filenames, file_sizes}          │
  └──────────────────────────────────────────────────────────────────┘
         ↓
    Session created in DB

STEP 4: PARSE CSV FILES
  ┌──────────────────────────────────────────────────────────────────┐
  │ LetterboxdParser.parse_watched/ratings/diary/likes()            │
  │                                                                   │
  │ Each parser:                                                     │
  │  1. Reads CSV into pandas DataFrame                              │
  │  2. Validates required columns                                   │
  │  3. Groups by Letterboxd URI (deduplication key)                │
  │  4. Returns: Dict[uri → {movie, watches, ratings, likes}]       │
  │                                                                   │
  │ Example merged structure:                                        │
  │ {                                                                │
  │   'https://boxd.it/1skk': {                                     │
  │     'movie': {'uri': '...', 'title': 'Inception', 'year': 2010} │
  │     'watches': [{watched_date, rating, rewatch, tags, review}] │
  │     'ratings': [{rating, date_rated}]                           │
  │     'likes': [{date_liked}]                                      │
  │   }                                                              │
  │ }                                                                │
  └──────────────────────────────────────────────────────────────────┘
         ↓
    CSV data in-memory (merged across files)

STEP 5: STORE TO DATABASE
  ┌──────────────────────────────────────────────────────────────────┐
  │ StorageService.store_movies(session_id, movies_list)            │
  │                                                                   │
  │ For each unique movie (URI):                                     │
  │  1. Transform to Movie model                                    │
  │  2. Extract first watch for watched_date, rating, etc.          │
  │  3. Insert all movies in bulk                                   │
  │  4. Update Session.total_movies count                           │
  │  5. Set tmdb_enriched=False for all (will be enriched next)     │
  │                                                                   │
  │ Fields stored from CSV:                                         │
  │  - title, year (from movie)                                    │
  │  - rating (from first watch)                                   │
  │  - watched_date (from first watch)                             │
  │  - letterboxd_uri (from movie)                                 │
  │  - rewatch, tags, review (from first watch)                    │
  └──────────────────────────────────────────────────────────────────┘
         ↓
    Movies stored in DB with session_id foreign key

STEP 6: SIGNAL ENRICHMENT START
  ┌──────────────────────────────────────────────────────────────────┐
  │ StorageService.update_session_status(session_id, 'enriching')   │
  │                                                                   │
  │ Status change: 'processing' → 'enriching'                        │
  │ This signals background worker to start enrichment               │
  └──────────────────────────────────────────────────────────────────┘
         ↓
    Session status = 'enriching'

STEP 7: BACKGROUND ENRICHMENT (APScheduler)
  ┌──────────────────────────────────────────────────────────────────┐
  │ EnrichmentWorker.enrich_sessions() [runs every 10 seconds]      │
  │                                                                   │
  │ For each session with status='enriching':                        │
  │  1. Get all movies where tmdb_enriched=False                    │
  │  2. For each movie:                                              │
  │     a. TMDBClient.search_movie(title, year)                      │
  │     b. TMDBClient.get_movie_details(tmdb_id)                     │
  │     c. TMDBClient.extract_enrichment_data()                      │
  │     d. StorageService.update_movie_enrichment()                  │
  │     e. StorageService.increment_enriched_count()                 │
  │  3. When all movies done: update_session_status(session, 'completed')
  │                                                                   │
  │ TMDB fields added to each movie:                                │
  │  - tmdb_id, genres, directors, cast                             │
  │  - runtime, budget, revenue, popularity, vote_average           │
  │  - original_language, country                                   │
  │  - tmdb_enriched=True, enriched_at=timestamp                    │
  └──────────────────────────────────────────────────────────────────┘
         ↓
    Movies progressively enriched

STEP 8: FRONTEND POLLS PROGRESS (useEnrichmentStatus hook)
  ┌──────────────────────────────────────────────────────────────────┐
  │ GET /api/session/{session_id}/status [every 2 seconds]          │
  │                                                                   │
  │ Returns:                                                         │
  │ {                                                                │
  │   session_id: uuid,                                              │
  │   status: 'enriching' | 'completed' | 'failed',                 │
  │   total_movies: 100,                                             │
  │   enriched_count: 45,  ← Denormalized, updated by worker       │
  │   progress_percent: 45,                                          │
  │   created_at, expires_at                                         │
  │ }                                                                │
  │                                                                   │
  │ Frontend: Shows progress bar (45/100 movies = 45%)              │
  └──────────────────────────────────────────────────────────────────┘
         ↓
    User sees real-time progress

STEP 9: ENRICHMENT COMPLETE
  ┌──────────────────────────────────────────────────────────────────┐
  │ Session status changes: 'enriching' → 'completed'               │
  │ All movies have tmdb_enriched=True                              │
  │ enriched_count == total_movies                                  │
  └──────────────────────────────────────────────────────────────────┘
         ↓
    Frontend shows "✓ Enrichment Complete!"

STEP 10: FRONTEND FETCHES ENRICHED DATA
  ┌──────────────────────────────────────────────────────────────────┐
  │ GET /api/session/{session_id}/movies [with pagination]          │
  │                                                                   │
  │ Returns paginated list of Movie objects with:                   │
  │  - CSV fields: title, year, rating, watched_date, etc.         │
  │  - TMDB fields: genres, directors, cast, runtime, etc.         │
  │  - Enrichment status: tmdb_enriched, enriched_at                │
  │                                                                   │
  │ Example movie response:                                          │
  │ {                                                                │
  │   "title": "Inception",                                          │
  │   "year": 2010,                                                   │
  │   "rating": 5.0,                                                │
  │   "watched_date": "2023-01-15T00:00:00",                        │
  │   "genres": ["Action", "Drama", "Science Fiction"],             │
  │   "directors": ["Christopher Nolan"],                            │
  │   "cast": ["Leonardo DiCaprio", "Marion Cotillard", ...],       │
  │   "runtime": 148,                                                │
  │   "country": "United States",                                    │
  │   "original_language": "en",                                     │
  │   "vote_average": 8.8                                            │
  │ }                                                                │
  └──────────────────────────────────────────────────────────────────┘
         ↓
    Frontend renders charts/analytics using enriched data

STEP 11: DATA VISUALIZATION (Frontend - Not in scope of this doc)
  └─→ Genre distribution chart (uses genres from TMDB)
  └─→ Director rankings (uses directors from TMDB)
  └─→ Language/Country distribution (uses original_language, country)
  └─→ Runtime statistics (uses runtime from TMDB)
  └─→ Rating analysis (uses vote_average from TMDB)
```

---

## Database Architecture

### Session Table

```python
# app/models/database.py: Session class

Primary Key:        id (UUID)
Timestamps:         created_at, last_accessed, expires_at
Status Tracking:    status, error_message
Progress Tracking:  total_movies (denormalized), enriched_count (denormalized)
Metadata:           upload_metadata (JSON) {filenames, file_sizes, user_agent}
Relationship:       movies (one-to-many, cascade delete)
```

**Key Design Decisions:**

1. **UUID as PK**: Session IDs are shared in URLs/frontend state → need unguessable, secure IDs
2. **Status Field** (`processing|enriching|completed|failed`):
   - Frontend polls to track progress
   - Worker looks for `status='enriching'` to know which sessions to enrich
   - Allows error tracking with `error_message` field

3. **Denormalized Counts** (`total_movies`, `enriched_count`):
   - **Why**: Avoid expensive `COUNT(*)` queries during rapid polling
   - **When updated**:
     - `total_movies`: Updated once after all movies stored
     - `enriched_count`: Incremented by worker for each movie enriched
   - **Query optimization**: Polling endpoint `GET /api/session/{id}/status` is O(1) instead of O(n)

4. **expires_at** (30 days):
   - Sessions auto-expire after 30 days
   - Background cleanup job can cascade-delete expired sessions
   - Extended every time session is accessed

### Movie Table

```python
# app/models/database.py: Movie class

Primary Key:        id (Integer, auto-increment)
Foreign Key:        session_id (UUID, required, cascades)
CSV Fields:         title, year, rating, watched_date, rewatch, tags, review, letterboxd_uri
TMDB Enrichment:    tmdb_id, genres, directors, cast, runtime, budget, revenue
                    popularity, vote_average, original_language, country
Status:             tmdb_enriched (boolean), enriched_at (timestamp)
Tracking:           created_at
```

**Key Design Decisions:**

1. **letterboxd_uri** as deduplication key (not title+year):
   - Letterboxd URIs are globally unique for movies
   - Same movie can have different titles across regions/editions
   - Prevents duplicate records for the same movie

2. **TMDB fields are JSON where possible**:
   - `genres`, `directors`, `cast` stored as JSON arrays
   - **Why**: Variable number of values per movie
   - **Example**: `genres = ["Action", "Drama", "Sci-Fi"]`

3. **tmdb_enriched flag + enriched_at timestamp**:
   - `tmdb_enriched=False` when initially stored
   - Set to `True` by worker after successful TMDB lookup
   - Allows filtering: `WHERE tmdb_enriched=False` to get unenriched movies

4. **Cascade delete on session_id**:
   - Deleting a session automatically deletes all its movies
   - Prevents orphaned movie records

### Relationship Diagram

```
┌─────────────────────────────────────────┐
│           Session (1)                   │
├─────────────────────────────────────────┤
│ id (UUID, PK)                           │
│ status: 'processing'|'enriching'|...    │
│ total_movies: 100 (denormalized)        │
│ enriched_count: 45 (denormalized)       │
│ expires_at: 2025-12-14                  │
│ upload_metadata: {filenames, ...}       │
│ created_at: timestamp                   │
└─────────────────────────────────────────┘
                 │
                 │ (1:N relationship)
                 │ cascade delete
                 │
┌─────────────────────────────────────────┐
│           Movie (N)                     │
├─────────────────────────────────────────┤
│ id (Integer, PK)                        │
│ session_id (UUID, FK) ← links to parent │
│                                         │
│ CSV Fields:                             │
│ - title, year, rating, watched_date     │
│ - rewatch, tags, review                 │
│ - letterboxd_uri (unique per session)   │
│                                         │
│ TMDB Fields (initially NULL):           │
│ - tmdb_id, genres, directors, cast      │
│ - runtime, budget, revenue              │
│ - popularity, vote_average              │
│ - original_language, country            │
│ - tmdb_enriched, enriched_at            │
└─────────────────────────────────────────┘
```

---

## Upload Process

### Sequence: User Uploads CSV Files

```
User clicks "Upload CSV"
    ↓
Frontend gathers selected files
    ↓
POST /api/upload (with MultipartForm data)
    ↓
Backend: app/api/upload.py upload_csv()
    ├─→ Validate files (must be .csv or .zip, not empty)
    ├─→ StorageService.create_session()
    │   └─→ Insert new Session record (status='processing')
    │   └─→ Returns session_id (UUID)
    │
    ├─→ For each file:
    │   ├─→ Read file content to BytesIO
    │   ├─→ Detect file type by filename:
    │   │   ├─ "watched" → LetterboxdParser.parse_watched()
    │   │   ├─ "ratings" → LetterboxdParser.parse_ratings()
    │   │   ├─ "diary" → LetterboxdParser.parse_diary()
    │   │   └─ "likes" → LetterboxdParser.parse_likes()
    │   │
    │   └─→ Merge parsed results into single dict by URI
    │
    ├─→ Convert merged dict to Movie records
    │   For each uri:
    │   {
    │     "title": movie.title,
    │     "year": movie.year,
    │     "rating": watches[0].rating,        ← first watch
    │     "watched_date": watches[0].watched_date,
    │     "letterboxd_uri": uri,
    │     "rewatch": watches[0].rewatch,
    │     "tags": watches[0].tags,
    │     "review": watches[0].review
    │   }
    │
    ├─→ StorageService.store_movies(session_id, movies_list)
    │   └─→ Bulk insert all movies with session_id FK
    │   └─→ Update Session.total_movies count
    │
    ├─→ StorageService.update_session_status(session_id, 'enriching')
    │   └─→ Status changes: 'processing' → 'enriching'
    │   └─→ Signals background worker to start enrichment
    │
    └─→ Return response:
        {
          "session_id": "550e8400-e29b-41d4-a716-446655440000",
          "status": "enriching",
          "total_movies": 100,
          "created_at": "2025-11-14T10:00:00"
        }
            ↓
    Frontend receives session_id
    Frontend saves to Zustand store: useSessionStore.setSessionId(session_id)
    Frontend navigates to /dashboard
    Frontend starts polling: useEnrichmentStatus(session_id)
```

### CSV Parser Design

**Why separate parsers for each CSV type?**

Each Letterboxd CSV has different columns and meanings:

| CSV Type | Primary Key | Key Columns | Purpose |
|----------|-----------|----------|---------|
| **watched.csv** | URI | Date, Name, Year, Letterboxd URI | Viewing history, when watched |
| **ratings.csv** | URI | Date (when rated), Rating, Name, Year, URI | Rating history, when rated |
| **diary.csv** | URI | Watched Date, Name, Year, [Diary text] | Diary entries, reviews, tags |
| **likes.csv** | URI | Date (when liked), Name, Year, URI | Like history |

**Parser workflow for each file:**

1. Read CSV into pandas DataFrame
2. Validate required columns exist
3. For each row:
   - Extract Letterboxd URI (deduplication key)
   - Extract relevant data (date, rating, tags, etc.)
   - Group by URI
4. Return: `Dict[uri → {movie, watches, ratings, likes}]`

**Example: parse_watched() output**

```python
{
    'https://boxd.it/1skk': {
        'movie': {
            'uri': 'https://boxd.it/1skk',
            'title': 'Inception',
            'year': 2010
        },
        'watches': [
            {
                'watched_date': datetime(2023, 1, 15),
                'rating': None,  # From watched.csv (no rating)
                'rewatch': False,
                'tags': [],
                'review': None
            }
        ],
        'ratings': [],  # Will be merged from ratings.csv
        'likes': []     # Will be merged from likes.csv
    },
    'https://boxd.it/2abc': { ... }
}
```

**Merging logic** (in upload.py):

```python
# After parsing all files, merge by URI
for uri, data in all_movies.items():
    if uri not in merged:
        merged[uri] = data
    else:
        # Merge arrays if file already processed
        if data.get("watches"):
            merged[uri].setdefault("watches", []).extend(data["watches"])
        if data.get("ratings"):
            merged[uri].setdefault("ratings", []).extend(data["ratings"])
        # ... etc
```

This allows combining data from multiple CSV files into a single normalized record.

---

## TMDB Enrichment Pipeline

### Architecture

The enrichment happens in the **background** asynchronously:

1. **APScheduler** runs every 10 seconds
2. **EnrichmentWorker** finds sessions with `status='enriching'`
3. For each session, enriches all `tmdb_enriched=False` movies
4. Updates progress and marks session `completed` when done

### Detailed Enrichment Flow

```
EnrichmentWorker.enrich_sessions() [runs every 10 seconds]
    │
    ├─→ StorageService.get_enriching_sessions()
    │   └─→ SELECT * FROM sessions WHERE status='enriching'
    │       AND expires_at > now()
    │
    └─→ For each session:
        │
        ├─→ EnrichmentWorker.enrich_session(session_id)
        │   │
        │   ├─→ StorageService.get_unenriched_movies(session_id)
        │   │   └─→ SELECT * FROM movies WHERE session_id=? AND tmdb_enriched=False
        │   │
        │   └─→ For each unenriched movie:
        │       │
        │       ├─→ TMDBClient.enrich_movie(title, year)
        │       │   │
        │       │   ├─→ Step 1: TMDBClient.search_movie(title, year)
        │       │   │   ├─→ GET /3/search/movie?query={title}&year={year}
        │       │   │   ├─→ [CACHE HIT/MISS: 10 min TTL]
        │       │   │   ├─→ Filter results by:
        │       │   │   │   - popularity > 1.0 (remove noise)
        │       │   │   │   - release_date year matches (if provided)
        │       │   │   ├─→ Returns: best_match {id, title, release_date, ...}
        │       │   │   │
        │       │   │   └─→ [RATE LIMITING: 40 req/10 sec, enforced by _wait_for_rate_limit()]
        │       │   │
        │       │   ├─→ Step 2: TMDBClient.get_movie_details(tmdb_id)
        │       │   │   ├─→ GET /3/movie/{tmdb_id}?append_to_response=credits
        │       │   │   ├─→ [CACHE HIT/MISS: 10 min TTL]
        │       │   │   ├─→ Returns full movie object with genres, cast, crew
        │       │   │   │
        │       │   │   └─→ Response includes:
        │       │   │       {
        │       │   │         "id": 550,
        │       │   │         "title": "Fight Club",
        │       │   │         "genres": [{"id": 18, "name": "Drama"}],
        │       │   │         "runtime": 139,
        │       │   │         "budget": 63000000,
        │       │   │         "revenue": 100853753,
        │       │   │         "popularity": 14.5,
        │       │   │         "vote_average": 8.8,
        │       │   │         "original_language": "en",
        │       │   │         "production_countries": [{"iso_3166_1": "US", "name": "United States"}],
        │       │   │         "credits": {
        │       │   │           "cast": [{...}, {...}],
        │       │   │           "crew": [{...}, {...}]
        │       │   │         }
        │       │   │       }
        │       │   │
        │       │   └─→ Step 3: TMDBClient.extract_enrichment_data(details)
        │       │       ├─→ Extract genres: [g.get('name') for g in details.get('genres', [])]
        │       │       │   └─→ Result: ["Drama", "Thriller"]
        │       │       │
        │       │       ├─→ Extract directors: [p for p in credits['crew'] if p['job']=='Director']
        │       │       │   └─→ Limit to top 3
        │       │       │   └─→ Result: ["David Fincher"]
        │       │       │
        │       │       ├─→ Extract cast: [p['name'] for p in credits['cast'][:5]]
        │       │       │   └─→ Limit to top 5
        │       │       │   └─→ Result: ["Brad Pitt", "Edward Norton", ...]
        │       │       │
        │       │       ├─→ Extract other fields:
        │       │       │   ├─ runtime
        │       │       │   ├─ budget
        │       │       │   ├─ revenue
        │       │       │   ├─ popularity
        │       │       │   ├─ vote_average
        │       │       │   ├─ original_language (NEW)
        │       │       │   └─ country (NEW)
        │       │       │
        │       │       └─→ Returns enrichment dict:
        │       │           {
        │       │             "tmdb_id": 550,
        │       │             "genres": ["Drama", "Thriller"],
        │       │             "directors": ["David Fincher"],
        │       │             "cast": ["Brad Pitt", "Edward Norton", ...],
        │       │             "runtime": 139,
        │       │             "budget": 63000000,
        │       │             "revenue": 100853753,
        │       │             "popularity": 14.5,
        │       │             "vote_average": 8.8,
        │       │             "original_language": "en",
        │       │             "country": "United States"
        │       │           }
        │       │
        │       ├─→ StorageService.update_movie_enrichment(movie_id, tmdb_data)
        │       │   └─→ UPDATE movies SET
        │       │       tmdb_id=?, genres=?, directors=?, cast=?,
        │       │       runtime=?, budget=?, revenue=?, popularity=?,
        │       │       vote_average=?, original_language=?, country=?,
        │       │       tmdb_enriched=True, enriched_at=now()
        │       │       WHERE id=?
        │       │
        │       └─→ StorageService.increment_enriched_count(session_id)
        │           └─→ UPDATE sessions SET enriched_count = enriched_count + 1
        │               WHERE id = ?
        │
        └─→ StorageService.update_session_status(session_id, 'completed')
            └─→ UPDATE sessions SET status='completed' WHERE id=?
```

### Rate Limiting

**TMDB Free Tier**: 40 requests per 10 seconds

**Implementation** (in TMDBClient._wait_for_rate_limit()):

```python
# Keep list of request timestamps
self._request_times = [t1, t2, t3, ...]

# Before each request:
# 1. Remove timestamps older than 10 seconds
cutoff = now - 10
self._request_times = [t for t in self._request_times if t > cutoff]

# 2. If we've hit 40 requests in last 10 sec, wait
if len(self._request_times) >= 40:
    wait_time = self._request_times[0] - cutoff + 0.1
    time.sleep(wait_time)

# 3. Record this request
self._request_times.append(now)
```

**Impact on enrichment speed**:
- With rate limiting: ~100-150 movies per minute
- E.g., enriching 500 movies takes ~3-5 minutes
- Frontend polls every 2 seconds, shows real-time progress

### Caching in TMDB Client

**Why**: TMDB is rate-limited, so caching search/detail results helps
**Where**: In-memory dictionary (`self._cache`)
**TTL**: 10 minutes
**Key format**: `f"{key_type}_{title}_{year}"` or `f"details_{tmdb_id}"`

**Example cache flow**:
```
1. First call: search_movie("Inception", 2010)
   └─→ Miss cache → API request → return + cache result
2. Second call: search_movie("Inception", 2010) [within 10 min]
   └─→ Hit cache → return cached result immediately
3. After 10 min: cache expires → next call makes new API request
```

---

## API Endpoints

### Upload Endpoint

```http
POST /api/upload
Content-Type: multipart/form-data

Request:
  - files: List[UploadFile] (watched.csv, ratings.csv, diary.csv, likes.csv)

Response: 201 Created
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enriching",
  "total_movies": 120,
  "created_at": "2025-11-14T10:30:00"
}

Error Cases:
  - 400: No files provided / Invalid file type
  - 500: Upload failed (CSV parse error, DB error, etc.)
```

### Get Session Status

```http
GET /api/session/{session_id}/status

Response: 200 OK
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enriching",           # or "completed", "failed"
  "total_movies": 120,
  "enriched_count": 45,            # Denormalized from DB
  "created_at": "2025-11-14T10:30:00",
  "expires_at": "2025-12-14T10:30:00",
  "error_message": null
}

Polling Pattern (Frontend):
  - Poll every 2 seconds
  - Calculate: progress_percent = (enriched_count / total_movies) * 100
  - When status changes to "completed", stop polling
```

### Get Session Movies

```http
GET /api/session/{session_id}/movies?page=1&per_page=50

Response: 200 OK
{
  "movies": [
    {
      "title": "Inception",
      "year": 2010,
      "rating": 5.0,
      "watched_date": "2023-01-15T00:00:00",
      "rewatch": false,
      "tags": ["sci-fi", "mind-bending"],
      "review": "Amazing film!",
      "letterboxd_uri": "https://boxd.it/1skk",

      # TMDB Enrichment (NULL if not enriched yet)
      "genres": ["Action", "Drama", "Science Fiction"],
      "directors": ["Christopher Nolan"],
      "cast": ["Leonardo DiCaprio", "Marion Cotillard", ...],
      "runtime": 148,
      "budget": 40000000,
      "revenue": 839671763,
      "popularity": 23.5,
      "vote_average": 8.8,
      "original_language": "en",
      "country": "United States"
    },
    ...
  ],
  "total": 120,
  "page": 1,
  "per_page": 50
}

Pagination:
  - page starts at 1 (not 0)
  - offset = (page - 1) * per_page
  - to get next page: add ?page=2
```

### Get Session Details

```http
GET /api/session/{session_id}

Response: 200 OK
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "total_movies": 120,
  "enriched_count": 120,
  "created_at": "2025-11-14T10:30:00",
  "expires_at": "2025-12-14T10:30:00",
  "metadata": {
    "files": ["watched.csv", "ratings.csv"]
  }
}
```

### Test/Verification Endpoints

```http
# Summary of enriched data
GET /api/test/session/{session_id}/movies-summary

Response:
{
  "session_id": "...",
  "status": "enriching",
  "total_movies": 100,
  "enriched_count": 45,
  "movies_sample": [
    {
      "id": 1,
      "title": "Inception",
      "year": 2010,
      "tmdb_enriched": true,
      "enriched_at": "2025-11-14T10:35:00",
      "genres": ["Action", "Drama", "Science Fiction"],
      "directors": ["Christopher Nolan"],
      "cast": ["Leonardo DiCaprio", ...],
      "runtime": 148,
      "original_language": "en",
      "country": "United States",
      "vote_average": 8.8
    },
    ...
  ]  # First 10 movies
}

---

# Detailed enrichment statistics
GET /api/test/session/{session_id}/enrichment-stats

Response:
{
  "session_id": "...",
  "total_movies": 100,
  "enriched_count": 100,
  "enrichment_percentage": 100.0,
  "data_summary": {
    "unique_genres": {
      "count": 15,
      "examples": ["Action", "Drama", "Comedy", ...]
    },
    "unique_directors": {
      "count": 42,
      "examples": [...]
    },
    "unique_languages": {
      "count": 8,
      "examples": ["en", "ja", "fr", "ko", ...]
    },
    "unique_countries": {
      "count": 6,
      "examples": ["United States", "Japan", "France", ...]
    },
    "runtime": {
      "average": 115.3,
      "total_hours": 96.1
    },
    "ratings": {
      "average": 7.8
    }
  }
}

---

# List movies still needing enrichment
GET /api/test/session/{session_id}/unenriched-movies

Response:
{
  "session_id": "...",
  "unenriched_count": 5,
  "movies": [
    {
      "id": 42,
      "title": "Very Obscure Movie",
      "year": 1923,
      "letterboxd_uri": "https://boxd.it/xxx"
    },
    ...
  ]  # First 20 unenriched
}
```

---

## Data Transformations

### Transformation Pipeline

```
LETTERBOXD CSV
    │
    ├─→ [1. Parse by file type]
    │
    ├─→ [2. Group by URI (deduplication)]
    │
    ├─→ [3. Merge multi-file data]
    │
    ├─→ [4. Transform to Movie model]
    │   (Extract CSV fields)
    │
    ├─→ [5. Store in database]
    │   (All movies created with tmdb_enriched=False)
    │
    ├─→ [6. TMDB enrichment (background)]
    │   (Fetch from TMDB API)
    │
    ├─→ [7. Extract enrichment data]
    │   (Parse TMDB response)
    │
    ├─→ [8. Update database]
    │   (Add TMDB fields to movie)
    │
    └─→ [9. Frontend fetches + displays]
        (Charts, analytics, etc.)
```

### Example Transformation: Ratings

**CSV File Content** (ratings.csv):
```csv
Date,Name,Year,Letterboxd URI,Rating
2023-01-15,Inception,2010,https://boxd.it/1skk,5
2023-02-20,The Matrix,1999,https://boxd.it/abc,5
```

**After parse_ratings()**:
```python
{
    'https://boxd.it/1skk': {
        'ratings': [{'rating': 5.0, 'date_rated': datetime(2023, 1, 15)}]
    },
    'https://boxd.it/abc': {
        'ratings': [{'rating': 5.0, 'date_rated': datetime(2023, 2, 20)}]
    }
}
```

**After merge with watched.csv**:
```python
{
    'https://boxd.it/1skk': {
        'movie': {'uri': '...', 'title': 'Inception', 'year': 2010},
        'watches': [...],        # From watched.csv
        'ratings': [...],        # From ratings.csv (merged)
        'likes': []
    }
}
```

**When storing to database** (in upload.py):
```python
# Take first watch as primary
watches = data.get("watches", [{}])[0]

movie_record = {
    "title": movie_data.get("title"),
    "year": movie_data.get("year"),
    "rating": watches.get("rating"),        # From first watch
    "watched_date": watches.get("watched_date"),
    "letterboxd_uri": uri,
    "rewatch": watches.get("rewatch", False),
    "tags": watches.get("tags", []),
    "review": watches.get("review")
}
```

**In database** (Movie record):
```python
Movie(
    session_id="550e8400-...",
    title="Inception",
    year=2010,
    rating=5.0,
    watched_date=datetime(2023, 1, 15),
    letterboxd_uri="https://boxd.it/1skk",
    rewatch=False,
    tags=[],
    review=None,

    # TMDB fields (initially NULL)
    tmdb_enriched=False,
    tmdb_id=None,
    genres=None,
    ...
)
```

**After TMDB enrichment** (worker updates):
```python
movie.tmdb_enriched = True
movie.tmdb_id = 27205
movie.genres = ["Action", "Drama", "Science Fiction"]
movie.directors = ["Christopher Nolan"]
movie.cast = ["Leonardo DiCaprio", "Marion Cotillard", "Joseph Gordon-Levitt"]
movie.runtime = 148
movie.budget = 40000000
movie.revenue = 839671763
movie.popularity = 23.5
movie.vote_average = 8.8
movie.original_language = "en"
movie.country = "United States"
movie.enriched_at = datetime.utcnow()
```

### Data Quality Issues & Handling

| Issue | Example | How Handled |
|-------|---------|------------|
| **Missing year** | Movie with no year | Stored as `year=NULL`, TMDB search harder without year |
| **Typo in title** | "Inceptoin" instead of "Inception" | TMDB may not find it, logged as unenriched |
| **Multiple languages** | Bilingual movie | Takes first production country only |
| **Very old movies** | Pre-1900 films | TMDB coverage sparse, may not enrich |
| **Duplicate entries** | Same movie twice | Deduplicated by Letterboxd URI |
| **No TMDB match** | Obscure indie film | Logged as warning, stays unenriched |

---

## Session Lifecycle

### State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────┘

                        CREATE SESSION
                              │
                              ↓
                        ┌──────────────┐
                        │  'processing'│ ← Upload being parsed
                        └──────────────┘
                              │
                   [Files parsed, movies stored]
                              │
                              ↓
                        ┌──────────────┐
                        │ 'enriching'  │ ← Worker enriching movies
                        └──────────────┘
                              │
                   [Background enrichment running]
                   [Frontend polls progress]
                              │
                              ↓
                        ┌──────────────┐
                        │ 'completed'  │ ← All movies enriched
                        └──────────────┘
                              │
                   [Frontend shows "✓ Complete"]
                   [Frontend fetches and displays data]
                              │
                              ↓
                        ┌──────────────┐
                        │ 'failed'     │ ← Error during processing
                        └──────────────┘
                              │
                   [error_message field populated]
                   [Frontend shows error]

Alternative path (empty CSV):
  'processing' → [No movies] → 'completed' [immediately]
```

### Timing Example (100 movies)

```
T=0s:     User uploads watched.csv (100 movies)
          POST /api/upload → Session created (status='processing')
          All 100 movies inserted (tmdb_enriched=False)
          Session.status set to 'enriching'
          Returns: session_id, status='enriching', total=100, enriched=0

T=0.1s:   Frontend receives session_id
          Frontend saves to Zustand: setSessionId(session_id)
          Frontend starts polling: GET /api/session/{id}/status

T=2s:     Frontend: enriched_count=0 (still waiting for worker)

T=10s:    [APScheduler trigger] EnrichmentWorker.enrich_sessions() runs
          Finds session with status='enriching'
          Starts enriching movies one by one

T=12s:    Frontend polls: enriched_count=10 (10%)
          Progress bar shows 10%

T=20s:    [APScheduler trigger] Worker continues enriching
          enriched_count=20 (20%)

T=30s:    Frontend polls: enriched_count=30 (30%)

...continue pattern...

T=120s:   [APScheduler trigger] Last movies enriched
          Session.status set to 'completed'
          enriched_count=100 (100%)

T=122s:   Frontend polls: status='completed', enriched_count=100
          Shows "✓ Enrichment Complete!"
          Stops polling
          Switches to display mode

T=124s:   Frontend: GET /api/session/{id}/movies
          Fetches enriched data
          Renders charts with genres, directors, etc.
```

### Session Expiry

- Sessions automatically expire after **30 days** of creation
- Every access (`get_session`) extends expiry by 30 days
- Expired sessions can be cascade-deleted by background task

---

## Frontend Integration Points

### Zustand Store State

Frontend must maintain these in state:

```typescript
interface SessionStore {
  sessionId: string | null
  status: 'uploading' | 'processing' | 'enriching' | 'completed' | 'failed'
  totalMovies: number
  enrichedCount: number
  progressPercent: number
  errorMessage: string | null

  // Actions
  setSessionId: (id: string) => void
  updateProgress: (enriched: number, total: number) => void
  setStatus: (status: string) => void
  clearSession: () => void
}
```

### Polling Hook (`useEnrichmentStatus`)

```typescript
function useEnrichmentStatus(sessionId: string | null, pollInterval = 2000) {
  // Polls GET /api/session/{sessionId}/status every 2 seconds
  // Returns: { status, isLoading, error }
  // Calculates progress_percent client-side
}
```

### Data Fetching Hook (Not yet implemented)

Frontend will need:

```typescript
function useEnrichedMovies(sessionId: string | null, page = 1, perPage = 50) {
  // Fetches GET /api/session/{sessionId}/movies?page=page&per_page=perPage
  // Returns: { movies, total, isLoading, error }
  // Used by dashboard to display charts
}
```

### API Call Flow

```
Frontend (React)
    │
    ├─→ [1. Upload]
    │   POST /api/upload → Get session_id
    │   Store in Zustand: setSessionId(session_id)
    │
    ├─→ [2. Navigate to Dashboard]
    │   Show: "Enriching your movies..."
    │
    ├─→ [3. Poll Progress]
    │   useEnrichmentStatus(sessionId) hook starts polling
    │   GET /api/session/{id}/status every 2 seconds
    │   Zustand: updateProgress(enriched_count, total_movies)
    │   Frontend: Shows progress bar (45/100 movies)
    │
    ├─→ [4. Wait for Completion]
    │   Poll until status='completed'
    │   Stop polling
    │
    └─→ [5. Display Results]
        GET /api/session/{id}/movies (fetch all enriched data)
        Zustand: setMovies(movies)
        Frontend: Render charts using genres, directors, etc.
```

---

## Proposed Improvements

### 1. **Implement Watchlist/Rewatch Tracking**

**Current Behavior**:
- Stores only first watch in database
- Doesn't track rewatches (though CSV parser supports it)

**Problem**:
- If user watched "Inception" 3 times, database only shows 1 watch
- Loses information about viewing patterns

**Proposed Solution**:

```python
# app/models/database.py

class MovieWatch(Base):
    """Track individual viewings"""
    __tablename__ = "movie_watches"

    id = Column(Integer, primary_key=True)
    movie_id = Column(Integer, ForeignKey("movies.id"), nullable=False)
    watched_date = Column(DateTime, nullable=True)
    rating = Column(Float, nullable=True)  # Can rate differently on rewatch
    review = Column(Text, nullable=True)
    diary_entry_date = Column(DateTime, nullable=True)

    movie = relationship("Movie", back_populates="watches")

class Movie(Base):
    """Updated to track watches"""
    __tablename__ = "movies"

    # ... existing fields ...

    # Relationship to watches
    watches = relationship("MovieWatch", back_populates="movie", cascade="all, delete-orphan")
```

**Benefits**:
- Track viewing patterns over time
- Analyze rewatch frequency
- Show timeline of when user watched each movie
- Different ratings per rewatch

**Impact**: Medium effort, high value for analytics

---

### 2. **Implement Caching Strategy**

**Current State**:
- TMDB Client has in-memory cache (10 min TTL, lost on restart)
- No persistent cache across restarts

**Problem**:
- If backend restarts, all cache is lost
- Next upload with same movies causes duplicate TMDB API calls
- Wastes API quota

**Proposed Solution**:

```python
# app/services/tmdb_cache.py

class TMDBCache(ABC):
    """Cache backend interface"""
    def get(self, key: str) -> Optional[Dict]
    def set(self, key: str, value: Dict, ttl: int)

class RedisCache(TMDBCache):
    """Persistent Redis cache"""
    def __init__(self, redis_client):
        self.redis = redis_client

    def get(self, key: str):
        data = self.redis.get(key)
        return json.loads(data) if data else None

    def set(self, key: str, value: Dict, ttl: int):
        self.redis.setex(key, ttl, json.dumps(value))

# In main.py
redis_cache = RedisCache(redis.Redis(...))
tmdb_client = TMDBClient(api_key, cache=redis_cache)
```

**Benefits**:
- Persistent cache across restarts
- Shared cache across multiple workers (in production)
- Reduce TMDB API calls dramatically
- Faster enrichment on repeated uploads

**Impact**: Low effort, very high value (especially as scale grows)

---

### 3. **Implement Retry Logic for Failed Enrichments**

**Current Behavior**:
- If TMDB enrichment fails, movie stays `tmdb_enriched=False` forever
- No retry mechanism

**Problem**:
- TMDB API may be temporarily down
- Network timeouts
- User may want to retry later

**Proposed Solution**:

```python
class Movie(Base):
    # Add to database.py

    # Enrichment attempt tracking
    enrichment_attempts = Column(Integer, default=0, nullable=False)
    last_enrichment_attempt = Column(DateTime, nullable=True)
    enrichment_error = Column(Text, nullable=True)  # Error message from last attempt

# In enrichment_worker.py

def enrich_session(self, session_id: str):
    for movie in unenriched_movies:
        try:
            enrichment_data = self.tmdb_client.enrich_movie(...)
            # Success: save data
            self.storage.update_movie_enrichment(movie.id, enrichment_data)
        except Exception as e:
            # Failure: log error but allow retry
            self.storage.record_enrichment_failure(movie.id, str(e))
            # Only skip if: enrichment_attempts > MAX_RETRIES
            if movie.enrichment_attempts < MAX_RETRIES:
                # Will retry on next schedule cycle
                self.storage.increment_enrichment_attempts(movie.id)
```

**Benefits**:
- Handles transient failures gracefully
- Can retry later when TMDB is back up
- Tracks failure reasons for debugging
- Doesn't block session completion

**Impact**: Medium effort, good value for reliability

---

### 4. **Add Session Queue/Priority System**

**Current Behavior**:
- All sessions enrich in first-come-first-served order
- No priority system

**Problem**:
- If large session (5000 movies) uploaded first, blocks smaller sessions
- Unfair to users uploading smaller files

**Proposed Solution**:

```python
# Queue sessions by priority
# Priority = total_movies (smaller first)

class EnrichmentWorker:
    def get_enriching_sessions(self):
        # Instead of any order, get smallest first
        return self.storage.get_enriching_sessions(
            order_by="total_movies ASC"  # Smaller sessions first
        )
```

**Benefits**:
- Faster completion for users with small libraries
- Fairer distribution
- Better user experience

**Impact**: Low effort, good UX value

---

### 5. **Implement Batch TMDB Lookups**

**Current Behavior**:
- One movie = one TMDB API search + one details call
- 100 movies = 200 API calls (2 per movie)

**Problem**:
- TMDB rate limit: 40 requests per 10 seconds
- 100 movies = ~25 seconds minimum
- Inefficient

**Potential Solution** (TMDB doesn't support batch):
- Not really possible without TMDB supporting batch endpoint
- Could implement fuzzy matching to skip bad matches (fewer calls)
- Could use TV shows endpoint as fallback

**Impact**: Low effort, but limited by TMDB API design

---

### 6. **Add Data Validation & Cleansing**

**Current Behavior**:
- Stores CSV data as-is, minimal validation

**Problem**:
- Bad data in, bad results out
- Title typos, year 0, rating 10.5 (invalid)

**Proposed Solution**:

```python
class MovieValidator:
    def validate_title(self, title: str) -> bool:
        return len(title.strip()) > 0 and len(title) < 500

    def validate_year(self, year: Optional[int]) -> bool:
        if year is None:
            return True  # Optional
        return 1800 <= year <= datetime.now().year + 5

    def validate_rating(self, rating: Optional[float]) -> bool:
        if rating is None:
            return True  # Optional
        return 0 <= rating <= 5.0 and rating % 0.5 == 0
```

**Benefits**:
- Cleaner data
- Better TMDB matches
- Fewer errors in enrichment

**Impact**: Low effort, medium value

---

### 7. **Add Session Export/Import**

**Current Behavior**:
- Session data lives in database only
- Cannot export or share sessions

**Proposed Solution**:

```python
# Export
GET /api/session/{id}/export?format=json
# Returns: all movies with enrichment as JSON file
# User can: backup, share, analyze offline

# Import
POST /api/session/import
# Upload JSON file, recreate session
```

**Benefits**:
- Data portability
- Backups
- Sharing with friends
- Offline analysis

**Impact**: Medium effort, good feature value

---

### 8. **Add Duplicate Movie Detection**

**Current Behavior**:
- Uses letterboxd_uri for deduplication
- But same movie can appear in CSV multiple times with different entries

**Problem**:
- User might watch "Inception" twice, stored as separate records
- Hard to tell if it's a rewatch or duplicate

**Proposed Solution** (already in parser):
- Parser already supports multiple watches per URI
- But upload endpoint only takes first watch
- Should extend to store all watches in separate records (see improvement #1)

**Impact**: Depends on rewatch tracking implementation

---

### 9. **Add Analytics Endpoint**

**Current Behavior**:
- Stores enriched data, but no pre-computed analytics

**Problem**:
- Frontend must compute stats from all movies every time
- Expensive for large libraries

**Proposed Solution**:

```python
# Pre-compute and cache analytics
GET /api/session/{id}/analytics

Response:
{
  "movies": {
    "total": 500,
    "enriched": 500,
    "avg_rating": 7.2,
    "avg_runtime": 120
  },
  "genres": {
    "Drama": 150,
    "Comedy": 120,
    ...
  },
  "directors": {
    "Steven Spielberg": 12,
    "David Fincher": 8,
    ...
  },
  "languages": {
    "en": 400,
    "ja": 30,
    ...
  },
  "countries": {
    "United States": 350,
    "Japan": 40,
    ...
  }
}
```

**Benefits**:
- Fast analytics loading
- Reduces frontend computation
- Database can cache results

**Impact**: Medium effort, high value for performance

---

### 10. **Add Admin/Debug Endpoints**

**Current Behavior**:
- No visibility into worker status, error logs, etc.

**Proposed Solution**:

```python
# Worker status
GET /api/admin/worker/status
Response: {
  "running": true,
  "last_run": "2025-11-14T10:35:00",
  "next_run": "2025-11-14T10:45:00",
  "interval": 10,
  "sessions_in_queue": 3,
  "current_session_id": "550e8400-..."
}

# Detailed error logs
GET /api/admin/sessions/{id}/errors
Response: {
  "session_id": "...",
  "total_errors": 5,
  "errors": [
    {
      "movie_id": 42,
      "title": "Obscure Movie",
      "error": "Not found in TMDB",
      "timestamp": "2025-11-14T10:25:00"
    },
    ...
  ]
}

# Force re-enrich
POST /api/admin/sessions/{id}/re-enrich
# Resets all tmdb_enriched=False, triggers immediate enrichment
```

**Benefits**:
- Debugging easier
- Monitor system health
- Manual intervention if needed

**Impact**: Low effort, good for operations

---

## Error Handling & Edge Cases

### Error Scenarios

| Scenario | Current Handling | Proposed |
|----------|-----------------|----------|
| **Upload: No files** | HTTPException 400 | ✓ Handled |
| **Upload: Invalid CSV** | Exception caught, 500 | Add specific validation |
| **CSV: Missing columns** | LetterboxdParser raises ValueError | ✓ Handled |
| **CSV: Empty file** | Stored as session with 0 movies | ✓ Handled correctly |
| **TMDB: API down** | Returns None, movie stays unenriched | Add retry logic |
| **TMDB: Rate limit** | Waits and retries | ✓ Handled |
| **TMDB: Movie not found** | Logs warning, continues | ✓ Handled |
| **Session: Expired** | Returns 404 not found | ✓ Handled |
| **Database: Connection lost** | SQLAlchemyError caught, 500 | ✓ Handled |

### Edge Cases

**1. Very Large Upload (10,000+ movies)**
- Current: Works, but takes 50+ minutes
- Could implement: Streaming parser, chunked storage

**2. Duplicate Movie with Different Metadata**
- Current: Deduplicated by URI, first watch wins
- Could implement: Merge strategy for ratings across watches

**3. Special Characters in Title**
- Current: Works, stored as-is
- No issues found so far

**4. Missing Year in CSV**
- Current: Stored as NULL, TMDB search harder
- Works fine, though match quality lower

**5. Network Interruption During Upload**
- Current: Partial upload fails with 500
- Could implement: Resumable uploads (complex)

**6. Session Accessed Just Before Expiry**
- Current: Access extends expiry by 30 days
- ✓ Handled correctly

**7. Multiple Uploads of Same CSV**
- Current: Each creates new session, new movies
- Duplicates in database but isolated by session_id
- ✓ Not a problem

---

## Summary Table: Data Flow Components

| Component | Type | Role | Key Technology |
|-----------|------|------|-----------------|
| **CSV Parser** | Service | Parse + deduplicate files | Pandas |
| **Storage Service** | Service | Database CRUD operations | SQLAlchemy |
| **TMDB Client** | Service | TMDB API calls + caching | Requests, in-memory cache |
| **Enrichment Worker** | Service | Background enrichment | APScheduler |
| **Session API** | Endpoint | Create, status, fetch movies | FastAPI |
| **Upload API** | Endpoint | Upload CSV files | FastAPI, multipart |
| **Database** | Infrastructure | Data persistence | PostgreSQL |
| **Frontend Hook** | React | Poll progress | Axios, Zustand |
| **Zustand Store** | Frontend | Session state | Zustand |

---

## Conclusion

The application implements a clean **data ingestion → enrichment → analysis** pipeline with good separation of concerns:

1. **Upload & Parse** (synchronous): Fast, user sees results immediately
2. **Store** (synchronous): Data persisted, ready for enrichment
3. **Signal** (synchronous): Mark session as enriching for worker
4. **Enrich** (asynchronous): Background worker enriches data
5. **Poll** (asynchronous): Frontend polls progress
6. **Display** (on-demand): Fetch enriched data when ready

**Key strengths**:
- Asynchronous enrichment doesn't block UI
- Denormalized progress counters for fast polling
- URI-based deduplication is sound
- Good error handling and logging

**Main opportunities for improvement**:
1. Persistent caching (Redis)
2. Rewatch/watchlist tracking
3. Retry logic for enrichment failures
4. Session priority queue
5. Pre-computed analytics endpoint
