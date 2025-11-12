# IMPLEMENTATION OF ENRICHMENT BY TMDB

Enrich uploaded movies with metadata from TMDB (The Movie Database)

- Genres
- Runtime
- Directors
- Cast
- Popularity scores
- Ratings


### Architecture

```
POST /api/upload
    ↓
Create session (status='processing')
    ↓
Parse & store movies (status='enriching')
    ↓
Background Task: Enrich with TMDB
    ├─ For each movie:
    │  ├─ Search TMDB for title + year
    │  ├─ Get movie data (genres, cast, directors)
    │  ├─ Update movie record
    │  └─ Increment enriched_count
    └─ When done: status='completed'
    ↓
Frontend polls status
    ├─ Shows progress (enriched_count / total_movies)
    └─ Redirects when completed
    ↓
Dashboard displays enriched data
```

### Phase 3 Tasks

#### Task 1: TMDB Client Service

**File**: `app/services/tmdb_client.py`

**Functionality:**

- Search movies by title + year
- Get detailed movie info
- Cache responses (optional Redis)
- Handle rate limiting
- Graceful error handling

#### Task 2: Background Enrichment Task

**Tools**: APScheduler or Celery

**Functionality:**

- Poll for sessions with status='enriching'
- For each session, enrich all movies
- Update progress (enriched_count)
- Handle enrichment errors
- Set status='completed' when done

#### Task 3: Update Movie Model

**File**: `app/models/database.py`

**Changes:**

- Populate TMDB fields (genres, directors, cast, etc.)
- Add `tmdb_enriched` boolean flag
- Add `enriched_at` timestamp

#### Task 4: Update Dashboard

**Files**: Chart components

**Changes:**

- Display genres breakdown (now from TMDB)
- Show top directors (from TMDB cast data)
- Use runtime for average movie length stats
- Filter by genre/director

### Phase 3 Success Criteria

- [ ] Movies enriched with TMDB data
- [ ] Genre distribution chart shows actual genres
- [ ] Director rankings display correctly
- [ ] Progress tracking shows enrichment progress
- [ ] Handles movies not found in TMDB gracefully
- [ ] TMDB API rate limiting handled
- [ ] Enrichment can re-run on existing sessions
