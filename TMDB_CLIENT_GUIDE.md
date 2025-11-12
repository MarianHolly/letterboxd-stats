# TMDB Client Service - Beginner's Guide

**File**: `app/services/tmdb_client.py`
**Status**: ✅ Complete and ready to use
**Created**: November 12, 2025

---

## What is This Service? (Start Here)

The TMDB Client Service is a **helper tool** that talks to The Movie Database API to fetch information about movies.

Think of it like this:
- **Without TMDB Client**: Your app would need to write code every time it wants to search for a movie
- **With TMDB Client**: You have a ready-made tool that handles all the complexity

### What Problems Does It Solve?

1. **Talking to TMDB API** - Handles HTTP requests to the TMDB API
2. **Finding the Right Movie** - Searches for movies by title and year
3. **Getting Movie Details** - Fetches genres, directors, cast, runtime, etc.
4. **Avoiding Slow API Calls** - Remembers (caches) previous results
5. **Following API Rules** - Respects rate limits (40 requests per 10 seconds)
6. **Handling Problems** - Deals with network errors gracefully

---

## Simple Concept: What is Caching?

Before we go further, let's understand **caching** because it's used in this service.

### The Problem Without Caching
```
User searches "Fight Club"
  → Call TMDB API (takes 1 second) ✓

5 seconds later...
User searches "Fight Club" again
  → Call TMDB API again (takes 1 second) ✗ Wasteful!
```

### The Solution With Caching
```
User searches "Fight Club"
  → Call TMDB API (takes 1 second) ✓
  → Save result in memory

5 seconds later...
User searches "Fight Club" again
  → Check memory first (takes 0.001 seconds) ✓
  → Return saved result (no API call needed)
```

**In this service**: We cache results for 10 minutes, so searching for the same movie within 10 minutes returns instant results.

---

## Simple Concept: What is Rate Limiting?

TMDB allows only **40 requests every 10 seconds**. The service automatically enforces this.

### How It Works

```
Timeline:
Second 1: Requests 1-40 execute immediately
Second 5: Request 41 arrives
  → Service says: "Wait, you've sent 40 requests in the last 10 seconds"
  → Service sleeps for ~5 seconds
  → Request 41 executes
```

**You don't need to do anything** - it's automatic!

---

## Installation & Setup

### Step 1: Get TMDB API Key

1. Visit: https://www.themoviedb.org/settings/api
2. Create a free account (if you don't have one)
3. Request an API key (for "Developer" use)
4. Copy the API key

### Step 2: Add to Environment Variables

Edit your `.env` file:
```bash
TMDB_API_KEY=your_api_key_here
```

### Step 3: The Service is Ready

That's it! The service is already created. No installation needed.

---

## How to Use It (Simple Examples)

### Example 1: Search for a Movie

**Scenario**: You want to find TMDB information about "The Matrix" from 1999.

```python
from app.services.tmdb_client import TMDBClient

# Create a client (usually done once at startup)
client = TMDBClient(api_key="your_api_key")

# Search for the movie
result = client.search_movie("The Matrix", year=1999)

# Check if found
if result:
    print(f"Found: {result['title']}")
    print(f"TMDB ID: {result['id']}")
    print(f"Release Date: {result['release_date']}")
else:
    print("Movie not found")
```

**What happens behind the scenes**:
1. Service formats your search request
2. Sends it to TMDB API
3. Gets back search results
4. Returns the best match
5. Saves result in cache for next time

**Returned data looks like**:
```python
{
    'id': 603,
    'title': 'The Matrix',
    'release_date': '1999-03-31',
    'overview': 'Set in the real world...'
}
```

---

### Example 2: Get Detailed Movie Information

**Scenario**: Now that you know the TMDB ID, get detailed information.

```python
# Get detailed information
details = client.get_movie_details(603)  # 603 is TMDB ID for The Matrix

if details:
    print(f"Title: {details['title']}")
    print(f"Runtime: {details['runtime']} minutes")
    print(f"Budget: ${details['budget']:,}")
    print(f"Rating: {details['vote_average']}/10")

    # Get genres
    genres = [g['name'] for g in details.get('genres', [])]
    print(f"Genres: {', '.join(genres)}")

    # Get directors from credits
    crew = details.get('credits', {}).get('crew', [])
    directors = [p['name'] for p in crew if p['job'] == 'Director']
    print(f"Directors: {', '.join(directors)}")

    # Get actors from credits
    cast = details.get('credits', {}).get('cast', [])
    actors = [p['name'] for p in cast[:5]]
    print(f"Main Cast: {', '.join(actors)}")
```

**Returned data looks like**:
```python
{
    'id': 603,
    'title': 'The Matrix',
    'runtime': 136,
    'budget': 63000000,
    'revenue': 467222728,
    'popularity': 45.5,
    'vote_average': 8.7,
    'genres': [
        {'id': 28, 'name': 'Action'},
        {'id': 18, 'name': 'Drama'}
    ],
    'credits': {
        'cast': [
            {'name': 'Keanu Reeves', 'character': 'Neo'},
            {'name': 'Laurence Fishburne', 'character': 'Morpheus'},
            ...
        ],
        'crew': [
            {'name': 'Lana Wachowski', 'job': 'Director'},
            {'name': 'Lilly Wachowski', 'job': 'Director'},
            ...
        ]
    }
}
```

---

### Example 3: The Easy Way (Recommended)

**Scenario**: You want everything in one call - just give title and year.

```python
# This does search + get details + extract useful data in one call
enrichment = client.enrich_movie("The Matrix", year=1999)

if enrichment:
    print(f"Genres: {enrichment['genres']}")
    print(f"Directors: {enrichment['directors']}")
    print(f"Cast: {enrichment['cast']}")
    print(f"Runtime: {enrichment['runtime']} minutes")
    print(f"TMDB Rating: {enrichment['vote_average']}/10")
else:
    print("Movie not found or enrichment failed")
```

**This is the cleaned-up data**:
```python
{
    'tmdb_id': 603,
    'genres': ['Action', 'Drama', 'Science Fiction'],
    'directors': ['Lana Wachowski', 'Lilly Wachowski'],
    'cast': ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving', 'Joe Pantoliano'],
    'runtime': 136,
    'budget': 63000000,
    'revenue': 467222728,
    'popularity': 45.5,
    'vote_average': 8.7
}
```

**This is what we store in the database** ✓

---

## Understanding the Code Structure

Let's look at the actual code organization:

### The Class Definition

```python
class TMDBClient:
    """Client for TMDB API with caching and rate limiting support."""

    # Constants (settings that don't change)
    BASE_URL = "https://api.themoviedb.org/3"
    REQUEST_LIMIT = 40
    RATE_LIMIT_WINDOW = 10
    CACHE_TTL = 600

    def __init__(self, api_key: str):
        """Set up the client with your API key"""
        self.api_key = api_key
        self._cache = {}  # Remember previous searches
        self._request_times = []  # Track requests for rate limiting
```

### The Three Main Methods

```
enrich_movie()  ← USE THIS ONE (easiest, does everything)
    ↓
    calls: search_movie() → find TMDB ID
    ↓
    calls: get_movie_details() → fetch full info
    ↓
    calls: extract_enrichment_data() → clean it up
    ↓
    returns: nice clean data for database
```

---

## How the Service Fits Into Your App

### The Big Picture

```
1. User uploads CSV file
   ↓
2. Backend parses CSV (gets movie titles and years)
   ↓
3. For each movie:
   → TMDB Client searches TMDB
   → Gets genres, directors, cast, runtime, etc.
   → Saves to database
   ↓
4. Frontend shows enriched data
```

### In Code (Preview of EnrichmentWorker)

```python
from app.services.tmdb_client import TMDBClient
from app.services.storage import StorageService

tmdb_client = TMDBClient(api_key="your_key")
storage = StorageService(db)

# Get movies that don't have TMDB data yet
unenriched_movies = storage.get_unenriched_movies(session_id)

# Enrich each one
for movie in unenriched_movies:
    # Ask TMDB for information
    enrichment_data = tmdb_client.enrich_movie(movie.title, movie.year)

    if enrichment_data:
        # Save to database
        storage.update_movie_enrichment(movie.id, enrichment_data)
    else:
        # Movie not found in TMDB - log and skip
        logger.warning(f"Could not find '{movie.title}' in TMDB")
```

---

## Common Questions Answered

### Q: What if the user's movie isn't in TMDB?

**A**: The service returns `None`. The enrichment worker logs it and skips to the next movie. The user can still see the movie, but without TMDB genres/directors/cast.

```python
enrichment = client.enrich_movie("Super Obscure Movie", year=1923)

if enrichment is None:
    print("Not found - that's okay, continue with next movie")
```

### Q: Why do we cache results?

**A**: Two reasons:
1. **Speed**: Searching cache takes <0.01 seconds instead of 1 second
2. **API Limits**: Fewer API calls = staying within TMDB's 40 requests/10 seconds limit

### Q: What if my API key is invalid?

**A**: The service will log an error message but won't crash. It returns `None` for that movie.

```python
# If API key is wrong:
# ERROR: Invalid TMDB API key
# Returns: None
```

### Q: Can I clear the cache?

**A**: Yes, if memory becomes an issue:

```python
client.clear_cache()  # Clears all cached results
```

### Q: What if TMDB API goes down?

**A**: The service catches the error, logs it, returns `None`, and continues. Your app doesn't crash.

---

## Error Handling (What Can Go Wrong?)

### Handled Automatically

The service handles these without crashing:

| Problem | What Happens | Return Value |
|---------|-------------|--------------|
| Network timeout | Logs warning | `None` |
| Invalid API key | Logs error | `None` |
| Movie not found | Logs debug | `None` |
| Rate limit hit | Waits automatically | Response continues |
| Malformed response | Logs error | `None` |

**Bottom line**: The service is defensive. It never crashes your app.

---

## Performance: What to Expect

### Response Times

| Scenario | Time |
|----------|------|
| First search (new movie) | ~1 second |
| Cached search (within 10 min) | <0.01 seconds |
| First get_details (new movie) | ~1 second |
| Cached get_details | <0.01 seconds |
| Full enrich (uncached) | ~2-3 seconds |
| Full enrich (cached) | <0.02 seconds |

### Rate Limiting Impact

If enriching 100 movies at TMDB limits:

```
Without rate limiting:
  40 movies in 10 seconds
  Next movie must wait ~10 seconds
  Total: ~35 seconds for 100 movies

With automatic rate limiting:
  The service handles the waiting
  You don't need to think about it
  Total: ~30 seconds for 100 movies
```

---

## Code Quality & Safety

### Type Hints (For IDE Assistance)

The code uses type hints to help you:

```python
def enrich_movie(self, title: str, year: Optional[int] = None) -> Optional[Dict]:
    """
    title: must be a string
    year: can be an integer or None
    returns: a dictionary or None
    """
```

When you use the service, your IDE can:
- Auto-complete method names
- Warn you about wrong argument types
- Show you what's returned

### Input Validation

The service checks inputs:

```python
if not title or not isinstance(title, str):
    return None  # Prevents errors
```

### Graceful Degradation

If anything goes wrong, it logs the error and returns `None`. Your app continues running.

---

## Logging: What You'll See

### Successful Enrichment

```
DEBUG: Cache miss: search_fight_club_1999
DEBUG: Found movie: Fight Club (1999)
DEBUG: Cache miss: details_550
DEBUG: Fetched details for TMDB ID 550
INFO: Successfully enriched: Fight Club (1999) → TMDB ID 550
```

### Movie Not Found

```
DEBUG: Cache miss: search_unknown_movie_2024
DEBUG: No results for: Unknown Movie (2024)
DEBUG: Enrichment failed: movie not found 'Unknown Movie' (2024)
```

### Rate Limiting Triggered

```
DEBUG: Rate limit reached. Waiting 0.50 seconds
```

**These logs help you understand what's happening** when you're debugging.

---

## Next Step: How Will This Be Used?

This service is a **building block**. The next step is creating the **EnrichmentWorker** service that:

1. Uses TMDBClient to search and get details
2. Saves results to the database
3. Runs in the background
4. Updates progress as it goes

Think of it like:
- **TMDBClient** = Lookup tool (searches TMDB)
- **EnrichmentWorker** = Assembly line worker (uses the tool to process all movies)

---

## Summary

### What You Need to Know

1. **Purpose**: Fetches movie data from TMDB API
2. **Main Method**: `enrich_movie(title, year)` - does everything in one call
3. **Automatic Features**: Caching (10 min) + rate limiting (40/10 sec) + error handling
4. **Return Value**: Clean dictionary with genres, directors, cast, runtime, etc. or `None`
5. **Errors**: Handled gracefully - never crashes your app

### Key Points

✅ Already created and ready to use
✅ No configuration needed (just API key in `.env`)
✅ Handles all errors automatically
✅ Caches results for speed
✅ Respects API rate limits
✅ Easy to use: just call `enrich_movie()`

### Next Steps

1. ✅ TMDB Client created ← You are here
2. ⏭️ Create EnrichmentWorker (uses this service)
3. ⏭️ Integrate with main.py
4. ⏭️ Test end-to-end
5. ⏭️ Frontend displays enriched data

---

## Cheat Sheet

### Quick Copy-Paste Usage

```python
from app.services.tmdb_client import TMDBClient
import os

# Initialize (usually in main.py startup)
api_key = os.getenv("TMDB_API_KEY")
tmdb_client = TMDBClient(api_key)

# Use it (in your enrichment worker)
enrichment = tmdb_client.enrich_movie("Movie Title", year=2020)

if enrichment:
    # Save to database
    storage.update_movie_enrichment(movie_id, enrichment)
else:
    # Movie not found
    logger.warning(f"Could not enrich movie")

# Optional: Clear cache if memory is an issue
tmdb_client.clear_cache()
```

That's it! Simple and effective.

---

## Questions & Troubleshooting

### "Why is enrichment slow?"

**Answer**: First-time searches take ~1 second per movie (TMDB API latency). Cached searches are instant. This is normal.

### "Why did enrichment return None?"

**Possible reasons**:
1. Movie not in TMDB database
2. TMDB API is down
3. API key is invalid
4. Network error

Check logs for details.

### "How many movies can I enrich at once?"

**Answer**: Theoretically unlimited, but respecting rate limits (~240 movies per minute at full speed). The service handles this automatically.

### "Can I customize what data is extracted?"

**Answer**: Yes! Modify `extract_enrichment_data()` method to add/remove fields. But for now, the defaults are good.
