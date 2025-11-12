# Phase 3 Implementation Plan - Frontend Integration & Testing

**Date**: November 12, 2025
**Status**: Planning
**Goal**: Build test page for data verification, then implement frontend features

---

## Executive Summary

**Phase 3 will focus on:**
1. **Extend TMDB Client** to fetch country & language
2. **Create test page** to verify enriched data before building UI
3. **Build progress tracking** (polling + progress bar)
4. **Implement data charts** (genres, directors, cast, runtime, country, language)
5. **Connect everything** with proper data flow

**Workflow**: Test → Progress → Charts (in that order)

---

## Part 1: Extend TMDB Client with Country & Language

### What's Missing

The TMDB Client currently extracts:
```python
{
    'tmdb_id': 603,
    'genres': ['Action', 'Drama'],
    'directors': ['Director 1', 'Director 2'],
    'cast': ['Actor 1', 'Actor 2'],
    'runtime': 136,
    'budget': 63000000,
    'revenue': 467222728,
    'popularity': 45.5,
    'vote_average': 8.7
}
```

**Need to add**:
- `country` - Country of origin
- `language` - Original language

### 1.1 Update Movie Model

**File**: `app/models/database.py`

Add two new fields after `vote_average`:

```python
# Line 196-197 (after vote_average)
# Original language of the film
original_language = Column(String(10), nullable=True)  # e.g., "en", "fr", "ja"

# Country of origin
country = Column(String(100), nullable=True)  # e.g., "United States" or "US, UK"
```

### 1.2 Update TMDBClient

**File**: `app/services/tmdb_client.py`

In the `extract_enrichment_data()` method (around line 263):

**Find this**:
```python
enrichment = {
    'tmdb_id': movie_details.get('id'),
    'genres': self._extract_genres(movie_details.get('genres', [])),
    'directors': self._extract_directors(movie_details.get('credits', {}).get('crew', [])),
    'cast': self._extract_cast(movie_details.get('credits', {}).get('cast', [])),
    'runtime': movie_details.get('runtime'),
    'budget': movie_details.get('budget'),
    'revenue': movie_details.get('revenue'),
    'popularity': movie_details.get('popularity'),
    'vote_average': movie_details.get('vote_average')
}
```

**Update to include**:
```python
enrichment = {
    'tmdb_id': movie_details.get('id'),
    'genres': self._extract_genres(movie_details.get('genres', [])),
    'directors': self._extract_directors(movie_details.get('credits', {}).get('crew', [])),
    'cast': self._extract_cast(movie_details.get('credits', {}).get('cast', [])),
    'runtime': movie_details.get('runtime'),
    'budget': movie_details.get('budget'),
    'revenue': movie_details.get('revenue'),
    'popularity': movie_details.get('popularity'),
    'vote_average': movie_details.get('vote_average'),
    'original_language': movie_details.get('original_language'),  # NEW
    'country': self._extract_country(                              # NEW
        movie_details.get('production_countries', [])
    )
}
```

**Add new helper method** (after `_extract_cast()` method):

```python
def _extract_country(self, production_countries: List[Dict]) -> Optional[str]:
    """Extract country name from production countries list.

    Args:
        production_countries: List of country dicts from TMDB

    Returns:
        Country name string or None

    Example:
        Input: [{'iso_3166_1': 'US', 'name': 'United States'}]
        Output: 'United States'
    """
    if not production_countries:
        return None

    # Get first country (most common case)
    country = production_countries[0].get('name')

    if country:
        return country.strip()

    return None
```

### 1.3 Update StorageService

**File**: `app/services/storage.py`

In `update_movie_enrichment()` method (around line 209-220):

**Find this**:
```python
movie.tmdb_id = tmdb_data.get("tmdb_id")
movie.genres = tmdb_data.get("genres")
movie.directors = tmdb_data.get("directors")
movie.cast = tmdb_data.get("cast")
movie.runtime = tmdb_data.get("runtime")
movie.budget = tmdb_data.get("budget")
movie.revenue = tmdb_data.get("revenue")
movie.popularity = tmdb_data.get("popularity")
movie.vote_average = tmdb_data.get("vote_average")
movie.tmdb_enriched = True
movie.enriched_at = datetime.utcnow()
```

**Update to**:
```python
movie.tmdb_id = tmdb_data.get("tmdb_id")
movie.genres = tmdb_data.get("genres")
movie.directors = tmdb_data.get("directors")
movie.cast = tmdb_data.get("cast")
movie.runtime = tmdb_data.get("runtime")
movie.budget = tmdb_data.get("budget")
movie.revenue = tmdb_data.get("revenue")
movie.popularity = tmdb_data.get("popularity")
movie.vote_average = tmdb_data.get("vote_average")
movie.original_language = tmdb_data.get("original_language")  # NEW
movie.country = tmdb_data.get("country")  # NEW
movie.tmdb_enriched = True
movie.enriched_at = datetime.utcnow()
```

---

## Part 2: Create Test Page for Data Verification

### 2.1 Create Test Endpoint

**File**: `app/api/test.py` (NEW FILE)

```python
"""
Test endpoints for data verification.

These endpoints help verify that enrichment is working correctly
and return the enriched data in a readable format.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.storage import StorageService

router = APIRouter()


@router.get("/test/session/{session_id}/movies-summary")
def get_movies_summary(session_id: str, db: Session = Depends(get_db)):
    """
    Get a summary of movies in a session with enrichment status.

    Shows:
    - Total movies
    - How many are enriched
    - Preview of enriched data
    """
    storage = StorageService(db)

    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    movies, total = storage.get_movies(session_id, limit=100)

    enriched_count = sum(1 for m in movies if m.tmdb_enriched)

    return {
        "session_id": session_id,
        "status": session.status,
        "total_movies": total,
        "enriched_count": enriched_count,
        "movies_sample": [
            {
                "id": m.id,
                "title": m.title,
                "year": m.year,
                "tmdb_enriched": m.tmdb_enriched,
                "enriched_at": m.enriched_at.isoformat() if m.enriched_at else None,
                "genres": m.genres,
                "directors": m.directors,
                "cast": m.cast,
                "runtime": m.runtime,
                "original_language": m.original_language,
                "country": m.country,
                "vote_average": m.vote_average
            }
            for m in movies[:10]  # First 10 movies
        ]
    }


@router.get("/test/session/{session_id}/enrichment-stats")
def get_enrichment_stats(session_id: str, db: Session = Depends(get_db)):
    """
    Get detailed enrichment statistics.

    Shows what data has been extracted and counts.
    """
    storage = StorageService(db)

    movies, total = storage.get_movies(session_id, limit=10000)
    enriched = [m for m in movies if m.tmdb_enriched]

    if not enriched:
        return {
            "session_id": session_id,
            "total_movies": total,
            "enriched_count": 0,
            "stats": "No enriched movies yet"
        }

    # Collect all genres, directors, languages, countries
    all_genres = set()
    all_directors = set()
    all_languages = set()
    all_countries = set()
    runtime_total = 0
    runtime_count = 0
    rating_total = 0
    rating_count = 0

    for movie in enriched:
        if movie.genres:
            all_genres.update(movie.genres)
        if movie.directors:
            all_directors.update(movie.directors)
        if movie.original_language:
            all_languages.add(movie.original_language)
        if movie.country:
            all_countries.add(movie.country)
        if movie.runtime:
            runtime_total += movie.runtime
            runtime_count += 1
        if movie.vote_average:
            rating_total += movie.vote_average
            rating_count += 1

    return {
        "session_id": session_id,
        "total_movies": total,
        "enriched_count": len(enriched),
        "enrichment_percentage": round((len(enriched) / total * 100), 1),
        "data_summary": {
            "unique_genres": {
                "count": len(all_genres),
                "examples": sorted(list(all_genres))[:5]
            },
            "unique_directors": {
                "count": len(all_directors),
                "examples": sorted(list(all_directors))[:5]
            },
            "unique_languages": {
                "count": len(all_languages),
                "examples": sorted(list(all_languages))
            },
            "unique_countries": {
                "count": len(all_countries),
                "examples": sorted(list(all_countries))
            },
            "runtime": {
                "average": round(runtime_total / runtime_count, 1) if runtime_count > 0 else None,
                "total_hours": round(runtime_total / 60, 1) if runtime_count > 0 else None
            },
            "ratings": {
                "average": round(rating_total / rating_count, 1) if rating_count > 0 else None
            }
        }
    }


@router.get("/test/session/{session_id}/unenriched-movies")
def get_unenriched_movies(session_id: str, db: Session = Depends(get_db)):
    """
    Get list of movies that still need enrichment.

    Useful for debugging why enrichment might be stuck.
    """
    storage = StorageService(db)

    unenriched = storage.get_unenriched_movies(session_id)

    return {
        "session_id": session_id,
        "unenriched_count": len(unenriched),
        "movies": [
            {
                "id": m.id,
                "title": m.title,
                "year": m.year,
                "letterboxd_uri": m.letterboxd_uri
            }
            for m in unenriched[:20]  # First 20
        ]
    }
```

### 2.2 Register Test Endpoint in main.py

**File**: `app/main.py`

Add import:
```python
from app.api import upload, session, test
```

Add router:
```python
app.include_router(test.router, prefix="/api", tags=["test"])
```

---

## Part 3: Build Progress Tracking (Frontend)

### 3.1 Create Enrichment Status Polling Hook

**File**: `frontend/hooks/use-enrichment-status.ts` (NEW)

```typescript
import { useState, useEffect } from 'react'
import axios from 'axios'

interface EnrichmentStatus {
  status: 'processing' | 'enriching' | 'completed' | 'failed'
  total_movies: number
  enriched_count: number
  progress_percent?: number
  created_at: string
  expires_at: string
  error_message?: string
}

export function useEnrichmentStatus(sessionId: string | null, pollInterval = 2000) {
  const [status, setStatus] = useState<EnrichmentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const fetchStatus = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/session/${sessionId}/status`
        )
        const data = response.data

        // Calculate progress percentage
        const progressPercent = data.total_movies > 0
          ? Math.round((data.enriched_count / data.total_movies) * 100)
          : 0

        setStatus({
          ...data,
          progress_percent: progressPercent
        })
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatus()

    // Poll at interval
    const interval = setInterval(fetchStatus, pollInterval)

    return () => clearInterval(interval)
  }, [sessionId, pollInterval])

  return { status, isLoading, error }
}
```

### 3.2 Create Progress Bar Component

**File**: `frontend/components/dashboard/enrichment-progress.tsx` (NEW)

```typescript
import { useEnrichmentStatus } from '@/hooks/use-enrichment-status'
import { Progress } from '@/components/ui/progress'

interface EnrichmentProgressProps {
  sessionId: string | null
  onComplete?: () => void
}

export function EnrichmentProgress({ sessionId, onComplete }: EnrichmentProgressProps) {
  const { status, isLoading, error } = useEnrichmentStatus(sessionId)

  if (!sessionId || !status) {
    return null
  }

  // Call onComplete when enrichment finishes
  React.useEffect(() => {
    if (status.status === 'completed' && onComplete) {
      onComplete()
    }
  }, [status.status, onComplete])

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700">Error: {error}</p>
      </div>
    )
  }

  if (status.status === 'completed') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <p className="text-green-700 font-semibold">✓ Enrichment Complete!</p>
        <p className="text-green-600">All {status.total_movies} movies enriched with TMDB data</p>
      </div>
    )
  }

  if (status.status !== 'enriching') {
    return null
  }

  return (
    <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-blue-900">Enriching movies with TMDB data...</p>
        <p className="text-blue-700 font-mono">
          {status.enriched_count} / {status.total_movies}
        </p>
      </div>

      <Progress
        value={status.progress_percent}
        className="h-2"
      />

      <p className="text-sm text-blue-600">
        {status.progress_percent}% complete
        {isLoading && ' (updating...)'}
      </p>
    </div>
  )
}
```

---

## Part 4: Build Data Display Components

### 4.1 Create Genre Chart (Updated)

**File**: `frontend/components/dashboard/charts/genre-distribution.tsx` (MODIFY)

Add check for TMDB data:

```typescript
// After fetching data
const hasEnrichedData = movies.some(m => m.genres && m.genres.length > 0)

if (!hasEnrichedData) {
  return <EmptyState message="Waiting for TMDB enrichment to get genres..." />
}

// Then render as before but with TMDB genres instead of CSV
```

### 4.2 Create Director Rankings Component

**File**: `frontend/components/dashboard/charts/director-rankings.tsx` (NEW)

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DirectorRankingsProps {
  movies: Movie[]
}

export function DirectorRankings({ movies }: DirectorRankingsProps) {
  // Count movies per director
  const directorCounts: Record<string, number> = {}

  movies.forEach(movie => {
    if (movie.directors && Array.isArray(movie.directors)) {
      movie.directors.forEach(director => {
        directorCounts[director] = (directorCounts[director] || 0) + 1
      })
    }
  })

  // Sort and take top 10
  const topDirectors = Object.entries(directorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([director, count]) => ({
      director,
      movies: count
    }))

  if (topDirectors.length === 0) {
    return <div className="p-4 text-gray-500">No director data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={topDirectors}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="director" angle={-45} textAnchor="end" height={100} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="movies" fill="#3b82f6" name="Movies Watched" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### 4.3 Create Language/Country Distribution

**File**: `frontend/components/dashboard/charts/language-country-dist.tsx` (NEW)

```typescript
interface LanguageCountryProps {
  movies: Movie[]
}

export function LanguageCountryDistribution({ movies }: LanguageCountryProps) {
  // Count by language
  const languageCounts: Record<string, number> = {}
  const countryCounts: Record<string, number> = {}

  movies.forEach(movie => {
    if (movie.original_language) {
      languageCounts[movie.original_language] = (languageCounts[movie.original_language] || 0) + 1
    }
    if (movie.country) {
      countryCounts[movie.country] = (countryCounts[movie.country] || 0) + 1
    }
  })

  const topLanguages = Object.entries(languageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const topCountries = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-semibold mb-3">Original Language</h3>
        {topLanguages.map(([lang, count]) => (
          <div key={lang} className="flex justify-between py-1">
            <span>{lang}</span>
            <span className="font-mono">{count}</span>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-3">Country</h3>
        {topCountries.map(([country, count]) => (
          <div key={country} className="flex justify-between py-1">
            <span>{country}</span>
            <span className="font-mono">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Part 5: Create Data Verification/Test Page

### 5.1 Create Frontend Test Page

**File**: `frontend/app/test-enrichment/page.tsx` (NEW)

```typescript
'use client'

import { useState } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function TestEnrichmentPage() {
  const [sessionId, setSessionId] = useState('')
  const [summary, setSummary] = useState(null)
  const [stats, setStats] = useState(null)
  const [unenriched, setUnenriched] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchTestData = async (endpoint: string, setter: any) => {
    if (!sessionId) {
      setError('Please enter a session ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/test${endpoint}/${sessionId}`
      )
      setter(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">TMDB Enrichment Test Page</h1>

      <div className="flex gap-2">
        <Input
          placeholder="Enter session ID"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        />
        <Button onClick={() => fetchTestData('/session/movies-summary', setSummary)}>
          Get Summary
        </Button>
        <Button onClick={() => fetchTestData('/session/enrichment-stats', setStats)}>
          Get Stats
        </Button>
        <Button onClick={() => fetchTestData('/session/unenriched-movies', setUnenriched)}>
          Get Unenriched
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Movies Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[600px]">
              {JSON.stringify(summary, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Enrichment Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-semibold">Overall Progress</p>
                <p className="text-2xl">{stats.enrichment_percentage}% ({stats.enriched_count}/{stats.total_movies})</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Genres</p>
                  <p className="text-lg">{stats.data_summary.unique_genres.count} unique</p>
                  <p className="text-sm text-gray-600">{stats.data_summary.unique_genres.examples.join(', ')}</p>
                </div>

                <div>
                  <p className="font-semibold">Directors</p>
                  <p className="text-lg">{stats.data_summary.unique_directors.count} unique</p>
                </div>

                <div>
                  <p className="font-semibold">Languages</p>
                  <p className="text-lg">{stats.data_summary.unique_languages.count} found</p>
                  <p className="text-sm text-gray-600">{stats.data_summary.unique_languages.examples.join(', ')}</p>
                </div>

                <div>
                  <p className="font-semibold">Countries</p>
                  <p className="text-lg">{stats.data_summary.unique_countries.count} found</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Average Runtime</p>
                  <p className="text-lg">{stats.data_summary.runtime.average} minutes</p>
                  <p className="text-sm text-gray-600">({stats.data_summary.runtime.total_hours} hours total)</p>
                </div>

                <div>
                  <p className="font-semibold">Average TMDB Rating</p>
                  <p className="text-lg">{stats.data_summary.ratings.average}/10</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {unenriched && (
        <Card>
          <CardHeader>
            <CardTitle>Unenriched Movies ({unenriched.unenriched_count})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {unenriched.movies.map((movie: any) => (
                <div key={movie.id} className="p-2 bg-gray-100 rounded">
                  <p className="font-semibold">{movie.title} ({movie.year})</p>
                  <p className="text-xs text-gray-600">{movie.letterboxd_uri}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## Complete Phase 3 Implementation Roadmap

### Phase 3A: Backend Extensions (1-2 hours)
1. ✅ Add country & language fields to Movie model
2. ✅ Update TMDBClient to extract country & language
3. ✅ Update StorageService to save new fields
4. ✅ Create test endpoints for data verification

### Phase 3B: Test & Verify Data (1-2 hours)
1. ✅ Create test page UI
2. ✅ Upload test CSV
3. ✅ Wait for enrichment to complete
4. ✅ Verify data quality using test endpoints
5. ✅ Check genres, directors, languages, countries, runtime

### Phase 3C: Progress Tracking (1-2 hours)
1. ✅ Create enrichment status polling hook
2. ✅ Create progress bar component
3. ✅ Integrate into dashboard
4. ✅ Test with real enrichment

### Phase 3D: Data Display Components (2-3 hours)
1. ✅ Genre distribution chart
2. ✅ Director rankings chart
3. ✅ Language/country distribution
4. ✅ Cast information display
5. ✅ Runtime statistics

### Phase 3E: Integration & Polish (1-2 hours)
1. ✅ Connect all components
2. ✅ Handle loading states
3. ✅ Error handling
4. ✅ Mobile responsiveness
5. ✅ End-to-end testing

---

## Testing Checklist

### Backend Testing
- [ ] Add country & language to Movie model
- [ ] TMDBClient extracts country & language correctly
- [ ] Test endpoints return properly formatted data
- [ ] StorageService saves all TMDB fields

### Data Verification (Using Test Page)
- [ ] Upload CSV with 10-20 movies
- [ ] Wait for enrichment to complete
- [ ] Check summary: all movies enriched?
- [ ] Check stats: genres/directors/languages/countries count?
- [ ] Check individual movies: all fields populated?

### Frontend Testing
- [ ] Progress bar updates correctly
- [ ] Progress bar completes when enrichment done
- [ ] Genre chart displays with TMDB data
- [ ] Director rankings show multiple directors
- [ ] Language/country distribution shows variety
- [ ] Test page accessible at `/test-enrichment`

---

## Dependencies to Install

### Frontend
- `axios` - Already installed ✅
- Recharts components - Already installed ✅

### Backend
- None new - All already installed ✅

---

## Estimated Effort

| Phase | Duration | Notes |
|-------|----------|-------|
| 3A: Backend | 1-2 hrs | Modify model, service, client |
| 3B: Test/Verify | 1-2 hrs | Create test page, validate data |
| 3C: Progress | 1-2 hrs | Polling hook + progress bar |
| 3D: Charts | 2-3 hrs | Genre, director, language/country |
| 3E: Integration | 1-2 hrs | Connect everything, polish |
| **Total** | **7-11 hours** | Dependent on testing |

---

## Success Criteria

✅ **Backend Ready**
- Country & language fields in model
- TMDB client extracts them
- Storage saves them
- Test endpoints work

✅ **Data Verified**
- Test page shows enriched data
- All fields populated correctly
- Stats page shows realistic counts
- Sample movies have complete data

✅ **Progress Works**
- Progress bar appears during enrichment
- Updates every 2 seconds
- Completes when enrichment done

✅ **Charts Display**
- Genre chart uses TMDB data
- Director rankings work
- Language/country distribution shows variety
- All use real enriched data (not mock)

✅ **End-to-End**
- Upload CSV → See progress → View results
- All components integrated
- No console errors
- Responsive on mobile

---

## Next Steps

1. **Review this plan** - Does it match your needs?
2. **Approve Phase 3A** - Backend extensions
3. **Start Phase 3A** - Add country/language to model and client
4. **Proceed through phases** in order: A → B → C → D → E

Ready to start Phase 3A (Backend Extensions)?
