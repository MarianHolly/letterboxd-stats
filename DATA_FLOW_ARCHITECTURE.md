# Complete Data Flow Architecture - Letterboxd Stats

**Document Version**: 2.0
**Last Updated**: November 14, 2025
**Status**: Production Reference
**Scope**: End-to-end data flow from CSV upload through enrichment to analytics display

---

## Table of Contents

1. [Quick Overview](#quick-overview)
2. [Core Architecture Principles](#core-architecture-principles)
3. [Complete User Journey](#complete-user-journey)
4. [Part 1: Upload & Parsing (Synchronous)](#part-1-upload--parsing-synchronous)
5. [Part 2: TMDB Enrichment (Asynchronous)](#part-2-tmdb-enrichment-asynchronous)
6. [Part 3: Frontend Progress & Display (Polling)](#part-3-frontend-progress--display-polling)
7. [Data Structures & Types](#data-structures--types)
8. [API Contract (Backend)](#api-contract-backend)
9. [Frontend Integration Points](#frontend-integration-points)
10. [Development & Testing Guide](#development--testing-guide)
11. [Known Issues & Improvements](#known-issues--improvements)

---

## Quick Overview

```
UPLOAD → PARSE → STORE → ENRICH → POLL → DISPLAY
```

| Phase | Location | Timing | Purpose |
|-------|----------|--------|---------|
| **Upload** | Frontend UI → Backend API | ~1s | User selects CSV files |
| **Parse** | Backend service layer | ~1s | Convert CSV to database records |
| **Store** | Database | ~0.5s | Persist movies |
| **Signal** | Backend API | ~0.1s | Mark session as "enriching" |
| **Enrich** | Background worker (every 10s) | 2-5min | Fetch TMDB metadata |
| **Poll** | Frontend hook (every 2s) | Continuous | Show enrichment progress |
| **Display** | React components | ~1s after complete | Render charts & analytics |

---

## Core Architecture Principles

### 1. **URI-Based Deduplication**
- Letterboxd URI (`https://boxd.it/xxxx`) uniquely identifies movies
- NOT title + year (which can differ by region/edition)
- Prevents duplicate records for same movie

### 2. **Multi-File Merging**
- User uploads 1-4 CSV files (watched, ratings, diary, likes)
- Each file has different structure and timestamps
- All merged into single denormalized movie record by URI

### 3. **Asynchronous Enrichment**
- TMDB enrichment happens in background (doesn't block upload)
- Frontend polls progress every 2 seconds
- User sees progress bar in real-time
- Allows 100-500 movie enrichments in seconds without UI lag

### 4. **Session-Based Isolation**
- Each upload creates separate UUID session
- Sessions expire after 30 days
- Automatic cascade delete on expiry (data cleanup)

### 5. **Denormalized Progress Tracking**
- `Session.total_movies` and `enriched_count` cached on session
- **Why**: Avoid expensive COUNT queries during rapid polling
- Polling endpoint is O(1) instead of O(n)

---

## Complete User Journey

### Step-by-Step Flow with Timing

```
T=0.0s   USER LANDS ON LANDING PAGE
         ├─→ Sees: "Upload your Letterboxd data"
         ├─→ Sees: CTA button "Get Started"
         └─→ Can: Browse locally or drag files

T=0.2s   USER SELECTS FILES
         ├─→ File dialog opens
         ├─→ Selects: watched.csv (required)
         ├─→ Also selects: ratings.csv, diary.csv (optional)
         └─→ Files added to upload queue

T=0.5s   USER CLICKS "UPLOAD"
         ├─→ Files validated (must be .csv)
         ├─→ FormData created with files
         └─→ POST /api/upload sent to backend

T=1.0s   BACKEND RECEIVES UPLOAD
         ├─→ Validates files (size, type)
         ├─→ Creates session (UUID)
         ├─→ Status: "processing"
         └─→ Returns: session_id, status, total_movies=0

T=1.5s   BACKEND PARSES CSV FILES
         ├─→ Detects file type (watched/ratings/diary/likes)
         ├─→ Parses with pandas/python
         ├─→ Groups by Letterboxd URI (deduplication)
         ├─→ Merges all files by URI
         └─→ Extracts: title, year, rating, watched_date, etc.

T=2.0s   BACKEND STORES TO DATABASE
         ├─→ Bulk insert all movies
         ├─→ Set tmdb_enriched=False for all
         ├─→ Update session.total_movies=100
         ├─→ Returns: session_id (now ready for enrichment)
         └─→ Returns: status="enriching"

T=2.5s   FRONTEND RECEIVES SESSION ID
         ├─→ Stores in Zustand: useUploadStore.sessionId
         ├─→ Persists to localStorage
         ├─→ Stores CSV data locally in Zustand
         └─→ Navigates to /dashboard

T=3.0s   DASHBOARD LOADS
         ├─→ Shows: Enrichment progress 0%
         ├─→ Shows: "Enriching your movies..."
         ├─→ Starts: useEnrichmentStatus(sessionId) polling
         └─→ Fetches: GET /api/session/{id}/status every 2s

T=5.0s   ENRICHMENT WORKER STARTS
         ├─→ APScheduler triggers (10s interval)
         ├─→ Finds: sessions with status="enriching"
         ├─→ Starts: enriching first batch of movies
         └─→ Increments: session.enriched_count per movie

T=7.0s   FRONTEND POLLS PROGRESS
         ├─→ GET /api/session/{id}/status
         ├─→ Receives: enriched_count=10, total_movies=100
         ├─→ Calculates: progress = 10/100 = 10%
         └─→ Updates: progress bar to 10%

T=15s    ENRICHMENT CONTINUES
         ├─→ Worker: 30/100 movies enriched
         ├─→ Frontend polls: Shows 30% progress
         └─→ User sees: Real-time progress updates

T=50s    ENRICHMENT COMPLETES
         ├─→ Worker: All 100 movies enriched
         ├─→ Worker: Sets session.status="completed"
         └─→ Worker: Sets session.enriched_count=100

T=52s    FRONTEND DETECTS COMPLETION
         ├─→ GET /api/session/{id}/status
         ├─→ Receives: status="completed"
         ├─→ Shows: "✓ Enrichment Complete!"
         ├─→ Stops: Polling (no more requests)
         └─→ Loads: Local analytics from CSV data

T=55s    FRONTEND FETCHES ENRICHED MOVIES (Optional)
         ├─→ GET /api/session/{id}/movies (with pagination)
         ├─→ Receives: 50 movies with TMDB metadata
         ├─→ Optional: Request more pages if needed
         └─→ Uses: genres, directors, cast for charts

T=60s    FRONTEND RENDERS DASHBOARD
         ├─→ Displays: Stats cards
         │   ├─ Total Movies: 100
         │   ├─ Average Rating: 7.2
         │   ├─ Tracking Period: 3 years
         │   └─ Total Hours: 150h
         │
         ├─→ Displays: Release Year chart
         │   ├─ X-axis: Years (2020-2024)
         │   └─ Y-axis: Movie count
         │
         ├─→ Displays: Rating Distribution
         │   ├─ 5★: 30 movies
         │   ├─ 4★: 40 movies
         │   └─ 3★: 30 movies
         │
         └─→ Shows: Imported files list
             ├─ watched.csv (500KB)
             ├─ ratings.csv (200KB)
             └─ diary.csv (1.2MB)

T=65s    USER EXPLORES DASHBOARD
         ├─→ Can: View uploaded files
         ├─→ Can: Clear and re-upload
         ├─→ Can: Navigate to analytics page
         └─→ Can: Return to landing to upload more
```

---

---

# PART 1: Upload & Parsing (Synchronous)

## 1.1 File Upload Flow

### Frontend: Upload Modal → Backend

**File**: `frontend/components/landing/upload-modal.tsx`

```tsx
// User selects files
const files = await fileInput.files  // watched.csv, ratings.csv, etc.

// Validate
if (!files.some(f => f.name.includes("watched"))) {
  showError("watched.csv is required");
  return;
}

// Create FormData
const formData = new FormData();
files.forEach(f => formData.append("files", f));

// Send to backend
const response = await fetch("/api/upload", {
  method: "POST",
  body: formData
});

const { session_id, status, total_movies } = await response.json();

// Store session
useUploadStore.setState({ sessionId: session_id });

// Store file data locally for offline use
files.forEach(file => {
  const content = await file.text();
  addFile({
    id: generateId(),
    name: file.name,
    size: file.size,
    type: detectType(file.name), // "watched" | "ratings" | "diary" | "likes"
    data: content,
    uploadedAt: Date.now()
  });
});
```

**Key Points**:
- FormData with multiple files (multipart/form-data)
- Reads file as text for local storage
- Files typed by filename detection
- Session ID stored in Zustand + localStorage

---

### Backend: POST /api/upload

**File**: `backend/app/api/upload.py` (lines 12-113)

#### Request Validation
```python
# 1. Check: Files provided
if not request.files or len(request.files) == 0:
    raise HTTPException(400, "No files provided")

# 2. Check: watched.csv required
if not any("watched" in f.filename for f in request.files):
    raise HTTPException(400, "watched.csv is required")

# 3. Check: File types valid
valid_types = {".csv", ".zip"}
for file in request.files:
    if not file.filename.lower().endswith(valid_types):
        raise HTTPException(400, "Only .csv and .zip files allowed")
```

#### Session Creation
```python
# Create session
session = storage.create_session(
    metadata={
        "filenames": [f.filename for f in files],
        "file_sizes": [f.size for f in files],
        "user_agent": request.headers.get("user-agent")
    }
)

session_id = str(session.id)  # UUID as string
# session.status = "processing"
# session.total_movies = 0
# session.enriched_count = 0
# session.expires_at = now + 30 days
```

#### File Detection & Parsing

**Detection Logic**:
```python
for file in files:
    filename_lower = file.filename.lower()

    if "watched" in filename_lower:
        parsed = parser.parse_watched(file.file)
    elif "ratings" in filename_lower:
        parsed = parser.parse_ratings(file.file)
    elif "diary" in filename_lower:
        parsed = parser.parse_diary(file.file)
    elif "likes" in filename_lower:
        parsed = parser.parse_likes(file.file)
    else:
        parsed = {}  # Skip unknown

    # Merge with existing
    all_movies = merge_all(all_movies, parsed)
```

---

## 1.2 CSV Parser Design

**File**: `backend/app/services/csv_parser.py`

### Data Structure (All Parsers Return)

```python
Dict[str, Dict[str, Any]] = {
    'https://boxd.it/1skk': {
        'movie': {
            'uri': 'https://boxd.it/1skk',
            'title': 'Inception',
            'year': 2010
        },
        'watches': [
            {
                'watched_date': datetime(2023, 1, 15),
                'diary_entry_date': None,
                'rating': 5.0,
                'rewatch': False,
                'tags': ['sci-fi', 'mind-bending'],
                'review': 'Amazing film!'
            }
        ],
        'ratings': [
            {
                'rating': 5.0,
                'date_rated': datetime(2023, 1, 15)
            }
        ],
        'likes': [
            {
                'date_liked': datetime(2023, 1, 15)
            }
        ]
    }
}
```

### Parser Methods

#### parse_watched(file_obj: BinaryIO)
**CSV Format**: `Date, Name, Year, Letterboxd URI, [optional columns]`

```python
def parse_watched(self, file_obj: BinaryIO) -> Dict:
    df = pd.read_csv(file_obj)

    # Validate required columns
    required = ['Name', 'Year', 'Letterboxd URI']
    if not all(col in df.columns for col in required):
        raise ValueError(f"Missing columns: {required}")

    result = {}
    for _, row in df.iterrows():
        uri = row['Letterboxd URI']
        result[uri] = {
            'movie': {
                'uri': uri,
                'title': row['Name'],
                'year': int(row['Year']) if pd.notna(row['Year']) else None
            },
            'watches': [{
                'watched_date': self._parse_date(row.get('Date')),
                'rating': None,  # No rating in watched.csv
                'rewatch': False,
                'tags': [],
                'review': None
            }],
            'ratings': [],
            'likes': []
        }
    return result
```

#### parse_diary(file_obj: BinaryIO)
**CSV Format**: `Date (entry posted), Name, Year, Letterboxd URI, Rating, Rewatch, Tags, Watched Date`

```python
def parse_diary(self, file_obj: BinaryIO) -> Dict:
    df = pd.read_csv(file_obj)

    required = ['Name', 'Year', 'Watched Date', 'Letterboxd URI']
    if not all(col in df.columns for col in required):
        raise ValueError(f"Missing columns: {required}")

    result = {}
    for _, row in df.iterrows():
        uri = row['Letterboxd URI']
        tags = self._parse_tags(row.get('Tags', ''))

        result[uri] = {
            'movie': {
                'uri': uri,
                'title': row['Name'],
                'year': int(row['Year']) if pd.notna(row['Year']) else None
            },
            'watches': [{
                'watched_date': self._parse_date(row['Watched Date']),
                'diary_entry_date': self._parse_date(row.get('Date')),
                'rating': self._normalize_rating(row.get('Rating')),
                'rewatch': self._parse_boolean(row.get('Rewatch', False)),
                'tags': tags,
                'review': row.get('Review')
            }],
            'ratings': [],
            'likes': []
        }
    return result
```

#### parse_ratings(file_obj: BinaryIO)
**CSV Format**: `Date (when rated), Name, Year, Letterboxd URI, Rating`

```python
def parse_ratings(self, file_obj: BinaryIO) -> Dict:
    df = pd.read_csv(file_obj)

    required = ['Name', 'Year', 'Rating', 'Letterboxd URI']

    result = {}
    for _, row in df.iterrows():
        uri = row['Letterboxd URI']
        result[uri] = {
            'movie': {...},
            'watches': [],
            'ratings': [{
                'rating': self._normalize_rating(row['Rating']),
                'date_rated': self._parse_date(row.get('Date'))
            }],
            'likes': []
        }
    return result
```

#### parse_likes(file_obj: BinaryIO)
**CSV Format**: `Date (when liked), Name, Year, Letterboxd URI`

```python
def parse_likes(self, file_obj: BinaryIO) -> Dict:
    df = pd.read_csv(file_obj)

    required = ['Name', 'Year', 'Letterboxd URI']

    result = {}
    for _, row in df.iterrows():
        uri = row['Letterboxd URI']
        result[uri] = {
            'movie': {...},
            'watches': [],
            'ratings': [],
            'likes': [{
                'date_liked': self._parse_date(row.get('Date'))
            }]
        }
    return result
```

### Helper Methods

```python
def _parse_date(self, date_value) -> Optional[datetime]:
    """Flexible date parsing"""
    if pd.isna(date_value):
        return None

    formats = [
        '%Y-%m-%d',      # 2024-01-15
        '%m/%d/%Y',      # 01/15/2024
        '%d/%m/%Y',      # 15/01/2024
        '%b %d, %Y',     # Jan 15, 2024
        '%B %d, %Y',     # January 15, 2024
    ]

    for fmt in formats:
        try:
            return datetime.strptime(str(date_value).strip(), fmt)
        except ValueError:
            continue

    return None

def _normalize_rating(self, rating) -> Optional[float]:
    """Convert to 0.5-5.0 scale"""
    if pd.isna(rating):
        return None

    rating_float = float(rating)

    # Clamp to 0.5-5.0 and round to nearest 0.5
    rating_float = max(0.5, min(5.0, rating_float))
    return round(rating_float * 2) / 2

def _parse_tags(self, tags_str: str) -> List[str]:
    """Parse semicolon-separated tags"""
    if not tags_str or pd.isna(tags_str):
        return []
    return [t.strip() for t in str(tags_str).split(';') if t.strip()]

def _parse_boolean(self, value) -> bool:
    """Parse yes/no, true/false, 1/0"""
    if pd.isna(value):
        return False
    return str(value).lower() in {'yes', 'true', '1', '✓', 'x'}
```

---

## 1.3 Data Merging & Storage

### Merge Multiple Parsers

```python
# In upload.py (lines ~50-80)
all_movies = {}

# Parse each file by type
for file in files:
    if "watched" in file.filename:
        watched_data = parser.parse_watched(file.file)
        # Merge
        for uri, data in watched_data.items():
            if uri not in all_movies:
                all_movies[uri] = data
            else:
                # Extend arrays
                all_movies[uri]['watches'].extend(data['watches'])

    elif "diary" in file.filename:
        diary_data = parser.parse_diary(file.file)
        for uri, data in diary_data.items():
            if uri not in all_movies:
                all_movies[uri] = data
            else:
                all_movies[uri]['watches'].extend(data['watches'])
                all_movies[uri]['diaries'].extend(data['diaries'])

    # ... repeat for ratings, likes
```

### Transform to Movie Records

```python
# Lines ~85-105
movies_to_store = []

for uri, data in all_movies.items():
    movie = data['movie']
    watches = data.get('watches', [{}])
    first_watch = watches[0] if watches else {}

    # Use first watch as primary
    movie_record = {
        'session_id': session.id,
        'title': movie.get('title'),
        'year': movie.get('year'),
        'letterboxd_uri': uri,
        'rating': first_watch.get('rating'),
        'watched_date': first_watch.get('watched_date'),
        'rewatch': first_watch.get('rewatch', False),
        'tags': first_watch.get('tags', []),
        'review': first_watch.get('review'),

        # TMDB fields (initially NULL)
        'tmdb_enriched': False,
        'tmdb_id': None,
        'genres': None,
        'directors': None,
        'cast': None,
        'runtime': None,
        'budget': None,
        'revenue': None,
        'popularity': None,
        'vote_average': None,
        'original_language': None,
        'country': None
    }

    movies_to_store.append(movie_record)
```

### Bulk Insert

```python
# Lines ~110-120
storage.store_movies(session_id, movies_to_store)
# Returns: count of inserted movies

# Update session metadata
session.total_movies = len(movies_to_store)
session.status = "enriching"  # Signal worker to start

# Commit and return
return {
    "session_id": str(session.id),
    "status": "enriching",
    "total_movies": len(movies_to_store),
    "created_at": session.created_at
}
```

---

# PART 2: TMDB Enrichment (Asynchronous)

## 2.1 Background Worker Scheduler

**File**: `backend/app/services/enrichment_worker.py`

### Initialization (in main.py)

```python
# FastAPI startup
from app.services.enrichment_worker import EnrichmentWorker

enrichment_worker = EnrichmentWorker(
    storage=storage_service,
    tmdb_client=tmdb_client
)

@app.on_event("startup")
async def startup():
    enrichment_worker.start_scheduler()
    # Scheduler runs every 10 seconds
    # Job: enrichment_worker.enrich_sessions()

@app.on_event("shutdown")
async def shutdown():
    enrichment_worker.stop_scheduler()
```

### Main Enrichment Loop

```python
class EnrichmentWorker:
    def __init__(self, storage, tmdb_client):
        self.storage = storage
        self.tmdb_client = tmdb_client
        self.scheduler = BackgroundScheduler()

    def start_scheduler(self):
        # Schedule job to run every 10 seconds
        self.scheduler.add_job(
            func=self.enrich_sessions,
            trigger="interval",
            seconds=10,
            id="tmdb_enrichment"
        )
        self.scheduler.start()

    def enrich_sessions(self):
        """
        Called every 10 seconds by APScheduler
        Processes all sessions with status='enriching'
        """
        try:
            # Fresh DB session for this cycle
            db = self.db_session_factory()

            # Get all enriching sessions
            enriching_sessions = self.storage.get_enriching_sessions(db)

            for session in enriching_sessions:
                try:
                    self.enrich_session(session.id, db)
                except Exception as e:
                    logger.error(f"Session {session.id} enrichment failed: {e}")
                    self.storage.update_session_status(db, session.id, "failed")
                    self.storage.set_error_message(db, session.id, str(e))
        finally:
            db.close()

    def enrich_session(self, session_id: str, db):
        """
        Enrich all movies in a session
        """
        # Get all unenriched movies
        unenriched = self.storage.get_unenriched_movies(db, session_id)

        if not unenriched:
            # All done
            self.storage.update_session_status(db, session_id, "completed")
            logger.info(f"Session {session_id} completed")
            return

        # Enrich each movie
        for movie in unenriched:
            try:
                # Enrich single movie
                enrichment_data = self.tmdb_client.enrich_movie(
                    title=movie.title,
                    year=movie.year
                )

                if enrichment_data:
                    # Save to database
                    self.storage.update_movie_enrichment(
                        db, movie.id, enrichment_data
                    )
                    logger.info(f"Enriched: {movie.title}")
                else:
                    logger.warning(f"No TMDB match: {movie.title} ({movie.year})")

            except Exception as e:
                logger.error(f"Failed to enrich {movie.title}: {e}")

            finally:
                # Always increment counter, even on failure
                self.storage.increment_enriched_count(db, session_id)
                db.commit()
```

---

## 2.2 TMDB Client

**File**: `backend/app/services/tmdb_client.py`

### Configuration

```python
class TMDBClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.themoviedb.org/3"
        self.session = requests.Session()

        # Rate limiting: 40 requests per 10 seconds
        self.rate_limit = 40
        self.rate_window = 10  # seconds
        self._request_times = []

        # Caching: 10 minute TTL
        self.cache = {}
        self.cache_ttl = 600  # seconds
```

### Main Enrichment Pipeline

```python
def enrich_movie(self, title: str, year: Optional[int]) -> Optional[Dict]:
    """
    Complete enrichment: search + fetch details + extract
    Returns: enrichment dict or None if not found
    """
    try:
        # Step 1: Search for movie
        search_result = self.search_movie(title, year)
        if not search_result:
            return None

        tmdb_id = search_result.get('id')

        # Step 2: Get full details
        details = self.get_movie_details(tmdb_id)
        if not details:
            return None

        # Step 3: Extract enrichment fields
        enrichment = self.extract_enrichment_data(details)
        enrichment['tmdb_id'] = tmdb_id

        return enrichment

    except Exception as e:
        logger.error(f"Enrichment failed for {title}: {e}")
        return None
```

### Search Movie

```python
def search_movie(self, title: str, year: Optional[int]) -> Optional[Dict]:
    """
    Search TMDB for movie
    Caches result, respects rate limits
    """
    # Check cache
    cache_result = self._get_from_cache(f"search_{title}_{year}")
    if cache_result:
        return cache_result

    # Rate limit
    self._wait_for_rate_limit()

    # Make request
    params = {
        'api_key': self.api_key,
        'query': title,
        'page': 1
    }
    if year:
        params['year'] = year

    response = self.session.get(
        f"{self.base_url}/search/movie",
        params=params,
        timeout=10
    )
    response.raise_for_status()

    data = response.json()
    results = data.get('results', [])

    if not results:
        return None

    # Filter by popularity and year match
    best_match = None
    for result in results:
        if result.get('popularity', 0) < 1.0:
            continue  # Skip noise

        if year:
            release_year = result.get('release_date', '')[:4]
            if release_year == str(year):
                best_match = result
                break
        else:
            best_match = result
            break

    if not best_match:
        best_match = results[0] if results else None

    # Cache result
    if best_match:
        self._set_cache(f"search_{title}_{year}", best_match)

    return best_match
```

### Get Movie Details

```python
def get_movie_details(self, tmdb_id: int) -> Optional[Dict]:
    """
    Fetch full movie details including credits
    """
    # Check cache
    cache_result = self._get_from_cache(f"details_{tmdb_id}")
    if cache_result:
        return cache_result

    # Rate limit
    self._wait_for_rate_limit()

    # Make request
    response = self.session.get(
        f"{self.base_url}/movie/{tmdb_id}",
        params={
            'api_key': self.api_key,
            'append_to_response': 'credits'
        },
        timeout=10
    )
    response.raise_for_status()

    details = response.json()

    # Cache result
    self._set_cache(f"details_{tmdb_id}", details)

    return details
```

### Extract Enrichment Data

```python
def extract_enrichment_data(self, movie_details: Dict) -> Dict:
    """
    Transform TMDB response to simplified structure
    """
    genres = self._extract_genres(movie_details.get('genres', []))
    directors = self._extract_directors(movie_details.get('credits', {}).get('crew', []))
    cast = self._extract_cast(movie_details.get('credits', {}).get('cast', []))
    country = self._extract_country(movie_details.get('production_countries', []))

    return {
        'genres': genres,
        'directors': directors,
        'cast': cast,
        'runtime': movie_details.get('runtime'),
        'budget': movie_details.get('budget'),
        'revenue': movie_details.get('revenue'),
        'popularity': movie_details.get('popularity'),
        'vote_average': movie_details.get('vote_average'),
        'original_language': movie_details.get('original_language'),
        'country': country
    }

def _extract_genres(self, genres: List[Dict]) -> List[str]:
    return [g.get('name') for g in genres if g.get('name')]

def _extract_directors(self, crew: List[Dict]) -> List[str]:
    directors = [p.get('name') for p in crew if p.get('job') == 'Director']
    return directors[:3]  # Top 3

def _extract_cast(self, cast: List[Dict]) -> List[str]:
    return [p.get('name') for p in cast[:5] if p.get('name')]

def _extract_country(self, production_countries: List[Dict]) -> Optional[str]:
    if not production_countries:
        return None
    return production_countries[0].get('name')
```

### Rate Limiting

```python
def _wait_for_rate_limit(self):
    """
    Enforce TMDB rate limit: 40 requests per 10 seconds
    """
    now = time.time()
    cutoff = now - self.rate_window

    # Remove old timestamps
    self._request_times = [t for t in self._request_times if t > cutoff]

    # Check if limit reached
    if len(self._request_times) >= self.rate_limit:
        wait_time = self._request_times[0] - cutoff + 0.1
        logger.warning(f"Rate limit hit, sleeping {wait_time:.2f}s")
        time.sleep(wait_time)
        self._request_times = []

    # Record this request
    self._request_times.append(now)
```

---

# PART 3: Frontend Progress & Display (Polling)

## 3.1 Enrichment Status Polling

**File**: `frontend/hooks/use-enrichment-status.ts`

```typescript
interface EnrichmentStatus {
  session_id: string;
  status: "processing" | "enriching" | "completed" | "failed";
  total_movies: number;
  enriched_count: number;
  progress_percent?: number;
  created_at: string;
  expires_at: string;
  error_message?: string;
}

export function useEnrichmentStatus(
  sessionId: string | null,
  pollInterval = 2000  // Default 2 seconds
) {
  const [status, setStatus] = useState<EnrichmentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/session/${sessionId}/status`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Calculate progress client-side
        data.progress_percent =
          data.total_movies > 0
            ? Math.round((data.enriched_count / data.total_movies) * 100)
            : 0;

        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        logger.error("Failed to fetch enrichment status", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Then poll every 2 seconds
    const interval = setInterval(fetchStatus, pollInterval);

    return () => clearInterval(interval);
  }, [sessionId, pollInterval]);

  return { status, isLoading, error };
}
```

## 3.2 Dashboard Integration

**File**: `frontend/app/dashboard/page.tsx`

```typescript
export default function DashboardPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load data from store
  const { files, sessionId } = useUploadStore();

  // Find watched file
  const watchedFile = files.find(f => f.type === "watched");

  // Poll enrichment progress (only if sessionId)
  const { status: enrichmentStatus } = useEnrichmentStatus(sessionId);

  // Parse and analyze CSV locally
  const enrichedData = useEnrichedData(watchedFile?.data);
  const analytics = useAnalytics(enrichedData);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Show upload prompt if no data
  if (!watchedFile) {
    return (
      <div>
        <p>No data uploaded yet</p>
        <button onClick={() => setIsUploadModalOpen(true)}>
          Upload CSV Files
        </button>
      </div>
    );
  }

  // Show enrichment in progress
  if (enrichmentStatus?.status === "enriching") {
    return (
      <div>
        <h2>Enriching your movies...</h2>
        <ProgressBar
          value={enrichmentStatus.progress_percent}
          max={100}
          label={`${enrichmentStatus.enriched_count}/${enrichmentStatus.total_movies}`}
        />
      </div>
    );
  }

  // Show dashboard
  return (
    <DashboardLayout>
      <div className="stats-grid">
        <StatsCard
          title="Total Movies"
          value={analytics.totalMovies}
        />
        <StatsCard
          title="Average Rating"
          value={analytics.averageRating.toFixed(1)}
        />
        <StatsCard
          title="Total Hours"
          value={analytics.totalHoursWatched}  {/* BUG: Property undefined */}
        />
        <StatsCard
          title="Tracking Period"
          value={analytics.totalDaysTracking}
        />
      </div>

      <Chart
        title="Movies by Release Year"
        data={analytics.moviesByReleaseYear}
      />

      <FileList files={files} onClearData={clearFiles} />

      <UploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
      />
    </DashboardLayout>
  );
}
```

---

# PART 4: Data Structures & Types

## 4.1 Frontend Data Models

### EnrichedData Interface

```typescript
// frontend/src/lib/data-processors/types.ts

export interface NormalizedMovie {
  id: string;          // Generated from name + year
  name: string;
  year: number | null;
  letterboxdUri: string | null;
}

export interface WatchHistoryEntry {
  movieId: string;
  date: Date;
  dateISO: string;     // YYYY-MM-DD
}

export interface RatingEntry {
  movieId: string;
  rating: number;      // 0.5-5.0
  dateRated: Date;
  dateRatedISO: string;
}

export interface LikeEntry {
  movieId: string;
  dateLiked: Date;
  dateLikedISO: string;
}

export interface DiaryEntry {
  movieId: string;
  watchedDate: Date;
  rating: number | null;
  rewatch: boolean;
  tags: string[];
  review?: string;
}

export interface EnrichedData {
  movies: Map<string, NormalizedMovie>;
  watchHistory: WatchHistoryEntry[];
  ratings: RatingEntry[];
  likes: LikeEntry[];
  diaryEntries: DiaryEntry[];

  metadata: {
    lastUpdated: Date;
    totalMoviesTracked: number;
    totalWatchCount: number;
    dateRangeStart: Date | null;
    dateRangeEnd: Date | null;
  };
}
```

### Analytics Interface

```typescript
export interface Analytics {
  totalMovies: number;
  totalWatchCount: number;
  averageRating: number;
  totalRatings: number;
  totalLikes: number;
  totalDaysTracking: number;

  dateRangeStart: string | null;
  dateRangeEnd: string | null;

  moviesByReleaseYear: Record<string, number>;
  ratingDistribution: Record<number, number>;
  yearsWatched: Record<string, number>;
  topWatchDates: Array<{ date: string; count: number }>;

  diaryByMonth: Array<{ month: string; count: number }>;
  diaryMonthlyByYear: Array<{
    year: number;
    data: Array<{ month: string; count: number }>
  }>;
  diaryStats: DiaryStats;
}
```

### Zustand Store State

```typescript
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: "watched" | "ratings" | "diary" | "likes" | "unknown";
  data: string;          // CSV content
  uploadedAt: number;    // Timestamp
}

export interface UploadStore {
  files: UploadedFile[];
  sessionId: string | null;

  // Actions
  addFile: (file: UploadedFile) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  getFile: (id: string) => UploadedFile | undefined;
  getFilesByType: (type: UploadedFile["type"]) => UploadedFile[];
  hasWatchedFile: () => boolean;
}
```

---

## 4.2 Backend Database Models

### Session Model

```python
# backend/app/models/database.py

class Session(Base):
    __tablename__ = "sessions"

    # Primary Key
    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Timestamps
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    last_accessed: datetime = Column(DateTime, default=datetime.utcnow)
    expires_at: datetime = Column(DateTime)  # now + 30 days

    # Status & Progress
    status: str = Column(String(20), default="processing")
    # Values: "processing" | "enriching" | "completed" | "failed"

    error_message: Optional[str] = Column(Text, nullable=True)

    # Denormalized counts (for fast polling)
    total_movies: int = Column(Integer, default=0)
    enriched_count: int = Column(Integer, default=0)

    # Metadata
    upload_metadata: dict = Column(JSON, nullable=True)
    # Example: {
    #   "filenames": ["watched.csv", "ratings.csv"],
    #   "file_sizes": [500000, 200000],
    #   "user_agent": "Mozilla/5.0..."
    # }

    # Relationships
    movies = relationship("Movie", back_populates="session", cascade="all, delete-orphan")
```

### Movie Model

```python
class Movie(Base):
    __tablename__ = "movies"

    # Primary Key
    id: int = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign Key
    session_id: UUID = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)

    # CSV Fields (from uploaded data)
    title: str = Column(String(255), nullable=False)
    year: Optional[int] = Column(Integer, nullable=True)
    rating: Optional[float] = Column(Float, nullable=True)  # 0.5-5.0
    watched_date: Optional[datetime] = Column(DateTime, nullable=True)
    rewatch: bool = Column(Boolean, default=False)
    tags: list = Column(JSON, default=[])
    review: Optional[str] = Column(Text, nullable=True)
    letterboxd_uri: str = Column(String(500), nullable=False)

    # TMDB Enrichment Fields (initially NULL)
    tmdb_enriched: bool = Column(Boolean, default=False)
    tmdb_id: Optional[int] = Column(Integer, nullable=True)
    genres: Optional[list] = Column(JSON, nullable=True)
    # Example: ["Action", "Drama", "Sci-Fi"]

    directors: Optional[list] = Column(JSON, nullable=True)
    # Example: ["Christopher Nolan"]

    cast: Optional[list] = Column(JSON, nullable=True)
    # Example: ["Leonardo DiCaprio", "Marion Cotillard", ...]

    runtime: Optional[int] = Column(Integer, nullable=True)
    budget: Optional[int] = Column(Integer, nullable=True)
    revenue: Optional[int] = Column(Integer, nullable=True)
    popularity: Optional[float] = Column(Float, nullable=True)
    vote_average: Optional[float] = Column(Float, nullable=True)
    original_language: Optional[str] = Column(String(10), nullable=True)
    country: Optional[str] = Column(String(100), nullable=True)

    # Tracking
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    enriched_at: Optional[datetime] = Column(DateTime, nullable=True)

    # Relationship
    session = relationship("Session", back_populates="movies")
```

---

# API Contract (Backend)

## 5.1 POST /api/upload

**Request**:
- Method: POST
- Content-Type: multipart/form-data
- Body: Files (1-4 CSV files)

**Response** (201 Created):
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enriching",
  "total_movies": 120,
  "created_at": "2025-11-14T10:30:00"
}
```

**Errors**:
- 400: No files / Invalid file type / Missing watched.csv
- 500: CSV parse error / Database error

---

## 5.2 GET /api/session/{session_id}/status

**Response** (200 OK):
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enriching",
  "total_movies": 120,
  "enriched_count": 45,
  "created_at": "2025-11-14T10:30:00",
  "expires_at": "2025-12-14T10:30:00",
  "error_message": null
}
```

**Usage**:
- Frontend polls every 2 seconds
- Calculate progress: `(enriched_count / total_movies) * 100`

---

## 5.3 GET /api/session/{session_id}/movies

**Query Parameters**:
- `page`: integer (default=1)
- `per_page`: integer (default=50, max=500)

**Response** (200 OK):
```json
{
  "movies": [
    {
      "id": 1,
      "title": "Inception",
      "year": 2010,
      "rating": 5.0,
      "watched_date": "2023-01-15T00:00:00",
      "rewatch": false,
      "tags": ["sci-fi", "favorite"],
      "review": "Amazing!",
      "letterboxd_uri": "https://boxd.it/1skk",

      "genres": ["Action", "Drama", "Science Fiction"],
      "directors": ["Christopher Nolan"],
      "cast": ["Leonardo DiCaprio", "Marion Cotillard"],
      "runtime": 148,
      "budget": 40000000,
      "revenue": 839671763,
      "popularity": 23.5,
      "vote_average": 8.8,
      "original_language": "en",
      "country": "United States"
    }
  ],
  "total": 120,
  "page": 1,
  "per_page": 50
}
```

---

# Frontend Integration Points

## 6.1 Hook Dependencies

```
Dashboard (page.tsx)
  ├── useUploadStore()
  │   └── files[], sessionId
  │
  ├── useEnrichmentStatus(sessionId)
  │   └── status, enriched_count, progress
  │
  ├── useEnrichedData(watchedFile?.data)
  │   ├── buildEnrichedData()
  │   │   ├── processWatchedFile()
  │   │   ├── processDiaryFile()
  │   │   ├── processRatingsFile()
  │   │   └── processLikesFile()
  │   └── Returns: EnrichedData
  │
  └── useAnalytics(enrichedData)
      └── Calculates: Analytics stats
```

## 6.2 Data Flow Map

```
CSV String (in Zustand)
    ↓ useEnrichedData()
    ├─ parseCSV()
    ├─ normalizeData()
    ├─ mergeEntries()
    └─ buildMaps()
        ↓
    EnrichedData object
        ↓ useAnalytics()
        ├─ countMovies()
        ├─ avgRating()
        ├─ groupByYear()
        └─ groupByMonth()
            ↓
        Analytics object
            ↓
    Dashboard renders with stats
```

---

# Development & Testing Guide

## 7.1 Local Testing Flow

### Test Upload & Parsing

```bash
# 1. Start backend
cd backend
python -m uvicorn app.main:app --reload

# 2. Upload test CSV
curl -X POST http://localhost:8000/api/upload \
  -F "files=@tests/fixtures/watched.csv" \
  -F "files=@tests/fixtures/ratings.csv"

# Response should include: session_id, status="enriching"
```

### Test Enrichment Progress

```bash
# Poll session status (every 2 seconds)
while true; do
  curl http://localhost:8000/api/session/{session_id}/status
  sleep 2
done

# Should show: enriched_count increasing, progress_percent increasing
# Finally: status="completed"
```

### Test Movie Retrieval

```bash
# Get enriched movies (after completed)
curl http://localhost:8000/api/session/{session_id}/movies?page=1&per_page=10

# Should include TMDB fields: genres, directors, cast, etc.
```

### Test Frontend Upload

```bash
# 1. Start frontend
cd frontend
npm run dev

# 2. Navigate to http://localhost:3000
# 3. Click "Get Started"
# 4. Drag & drop CSV files
# 5. Click "Upload"
# 6. Verify:
#    - Session ID stored in localStorage (DevTools → Application)
#    - Progress bar shows 0% initially
#    - Progress bar increases every 2 seconds
#    - Dashboard renders after completed
```

---

## 7.2 Database Inspection

```bash
# Connect to PostgreSQL
psql -U user -d letterboxddb -h localhost

# Check sessions
SELECT id, status, total_movies, enriched_count, created_at
FROM sessions
ORDER BY created_at DESC;

# Check movies (first 10)
SELECT id, title, year, tmdb_enriched, genres, directors
FROM movies
WHERE session_id = '{session_id}'
LIMIT 10;

# Check enrichment progress
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN tmdb_enriched THEN 1 ELSE 0 END) as enriched,
  ROUND(100.0 * SUM(CASE WHEN tmdb_enriched THEN 1 ELSE 0 END) / COUNT(*)) as percent
FROM movies
WHERE session_id = '{session_id}';
```

---

## 7.3 Backend Logs

```bash
# Watch enrichment worker logs
tail -f /tmp/letterboxd.log | grep "Enrichment\|EnrichmentWorker"

# Look for:
# - "Starting enrichment for session XXX"
# - "Enriched: Movie Title" (repeated)
# - "Session XXX completed" (final message)
```

---

# Known Issues & Improvements

## 8.1 Current Issues

### Issue 1: Missing `totalHoursWatched` Property
- **Location**: Dashboard page (line 156)
- **Problem**: References `analytics.totalHoursWatched` but property undefined in Analytics interface
- **Impact**: StatsCard displays undefined value
- **Fix**: Add to Analytics interface & calculate from runtime data

### Issue 2: Dashboard Data Flow Error
- **Location**: Dashboard page (line 35)
- **Problem**: Passes CSV string to `useAnalytics()` instead of `EnrichedData` object
- **Impact**: Analytics calculations receive wrong data type
- **Fix**: Use `useEnrichedData()` hook first to transform CSV

### Issue 3: No Enriched Data Display
- **Location**: Frontend
- **Problem**: Frontend doesn't fetch or display enriched TMDB data
- **Impact**: Charts can't use genres, directors, ratings from TMDB
- **Fix**: Implement `useEnrichedMovies()` hook to fetch `/api/session/{id}/movies`

---

## 8.2 Proposed Improvements

### 1. Rewatch Tracking
- **Current**: Only stores first watch per movie
- **Proposed**: Create `MovieWatch` model for each viewing
- **Benefit**: Track viewing patterns, analyze rewatches
- **Effort**: Medium

### 2. Redis Caching for TMDB
- **Current**: In-memory cache, lost on restart
- **Proposed**: Redis persistent cache
- **Benefit**: Faster enrichment on repeated uploads
- **Effort**: Low

### 3. Enrichment Retry Logic
- **Current**: Failed enrichments marked unenriched forever
- **Proposed**: Retry with exponential backoff
- **Benefit**: Handle transient TMDB failures gracefully
- **Effort**: Medium

### 4. Analytics Pre-computation
- **Current**: Frontend computes stats on every render
- **Proposed**: Backend `/api/session/{id}/analytics` endpoint
- **Benefit**: Faster dashboard load, reduces client computation
- **Effort**: Medium

### 5. Session Priority Queue
- **Current**: First-come-first-served enrichment
- **Proposed**: Prioritize smaller sessions first
- **Benefit**: Faster completion for smaller libraries
- **Effort**: Low

---

## 8.3 Testing Checklist

### Unit Tests
- [ ] CSV parser: each file type
- [ ] TMDB client: search, details, cache, rate limiting
- [ ] Analytics: calculations on sample data
- [ ] Enrichment worker: session processing

### Integration Tests
- [ ] Upload workflow: UI → API → Database
- [ ] Enrichment workflow: Status updates → completion
- [ ] Progress polling: Status changes reflected in real-time
- [ ] Data display: Charts render with correct data

### Manual Tests
- [ ] Upload single watched.csv (10 movies)
- [ ] Watch progress bar go 0% → 100%
- [ ] Check database for enriched TMDB data
- [ ] Verify genres/directors in enriched movies
- [ ] Test with large file (500+ movies)
- [ ] Test network interruption (pause/resume)

---

## Summary

This document provides a complete, production-ready reference for the entire data pipeline:

1. **Upload** → Validated, parsed, stored in ~2 seconds
2. **Enrich** → Background worker every 10 seconds, rate-limited TMDB API
3. **Progress** → Frontend polls every 2 seconds, shows real-time updates
4. **Display** → Analytics calculated from local CSV + enriched TMDB data

Each section includes:
- Actual code references (file paths & line numbers)
- Complete data structures (interfaces & models)
- API contracts (requests & responses)
- Error scenarios & edge cases
- Testing strategies & debugging tools

Use this document as a guide for implementing, testing, debugging, and improving the system.
