# Async Enrichment Implementation Plan

**Date**: November 14, 2025
**Objective**: Convert sequential TMDB enrichment to concurrent async processing
**Expected Result**: 5x-10x speed improvement (17.5s → 2-3s for 50 movies)
**Total Effort**: 4-5 hours
**Complexity**: Medium

---

## Overview

Convert the blocking sequential TMDB enrichment to async concurrent processing using `aiohttp` and `asyncio`. This will allow processing 10 movies simultaneously instead of 1 at a time.

### Current Performance
- **Movies processed**: 1 at a time (sequential)
- **Time per movie**: ~350ms average (200-500ms per TMDB API call)
- **50 movies**: 17.5+ seconds
- **Issue**: Exceeds 10-second scheduler interval → APScheduler warnings

### Target Performance
- **Movies processed**: 10 at a time (concurrent)
- **Time per batch**: ~350ms (same TMDB time, but 10 movies parallel)
- **50 movies**: 2-3 seconds total
- **Result**: Fits within 10-second interval, eliminates warnings

---

## Implementation Plan

### Part 1: Update Dependencies (15 minutes)

**File**: `backend/requirements.txt` or `pyproject.toml`

**Changes**:
```
# BEFORE
requests==2.31.0
aiohttp==3.9.1  # ← Already present or add it

# AFTER (ensure both are present)
requests==2.31.0  # Keep for backward compatibility
aiohttp==3.9.1    # Add for async HTTP
```

**Check current state**:
```bash
pip list | grep aiohttp
```

**Time**: 15 minutes
- Check if `aiohttp` already installed
- Add to requirements if missing
- No breaking changes

---

### Part 2: Async TMDB Client (1.5 hours)

**File**: `backend/app/services/tmdb_client.py`

**What to Change**:
1. Import `aiohttp` and `asyncio`
2. Make main `enrich_movie()` method async
3. Create separate async methods for search and details
4. Keep existing sync wrapper for backward compatibility

**Code Structure**:

```python
import aiohttp
import asyncio
from typing import Optional, Dict, Any

class TMDBClient:
    """TMDB API client with async/concurrent support"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.themoviedb.org/3"
        # Rate limiting: 40 requests per 10 seconds
        self.rate_limiter = asyncio.Semaphore(10)
        self.request_semaphore = asyncio.Semaphore(10)

    # NEW ASYNC METHOD
    async def search_movie_async(self, title: str, year: Optional[int] = None) -> Dict[str, Any]:
        """Async search for movie on TMDB"""
        async with self.rate_limiter:
            async with aiohttp.ClientSession() as session:
                params = {
                    "api_key": self.api_key,
                    "query": title,
                    "year": year,
                    "include_adult": False
                }
                async with session.get(
                    f"{self.base_url}/search/movie",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    return {"results": []}

    # NEW ASYNC METHOD
    async def get_movie_details_async(self, tmdb_id: int) -> Dict[str, Any]:
        """Async fetch detailed movie info from TMDB"""
        async with self.rate_limiter:
            async with aiohttp.ClientSession() as session:
                params = {
                    "api_key": self.api_key,
                    "append_to_response": "credits"
                }
                async with session.get(
                    f"{self.base_url}/movie/{tmdb_id}",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    return {}

    # NEW ASYNC METHOD - Main enrichment method
    async def enrich_movie_async(
        self,
        title: str,
        year: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Async enrich single movie from TMDB"""
        # Search for movie
        search_results = await self.search_movie_async(title, year)

        if not search_results.get("results"):
            return None

        # Get first result
        movie_data = search_results["results"][0]
        tmdb_id = movie_data.get("id")

        if not tmdb_id:
            return None

        # Get detailed info
        details = await self.get_movie_details_async(tmdb_id)

        # Extract and normalize data
        return {
            "tmdb_id": tmdb_id,
            "title": details.get("title", title),
            "genres": [g["name"] for g in details.get("genres", [])],
            "directors": [
                p["name"] for p in details.get("credits", {}).get("crew", [])
                if p.get("job") == "Director"
            ],
            "cast": [
                p["name"] for p in details.get("credits", {}).get("cast", [])[:5]
            ],
            "runtime": details.get("runtime"),
            "overview": details.get("overview"),
            "vote_average": details.get("vote_average"),
            "poster_path": details.get("poster_path")
        }

    # KEEP EXISTING SYNC METHOD for backward compatibility
    def enrich_movie(self, title: str, year: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Sync wrapper for backward compatibility"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(self.enrich_movie_async(title, year))
```

**Key Points**:
- Uses `asyncio.Semaphore(10)` to limit concurrent requests to 10 (matches TMDB rate limit)
- Each request has 10-second timeout
- Keeps existing `enrich_movie()` sync method for backward compatibility
- New async methods can be used by workers
- Uses context managers for proper session cleanup

**Testing**: See Part 5

**Time**: 1.5 hours
- 45 min: Write async methods
- 30 min: Test and debug
- 15 min: Ensure backward compatibility

---

### Part 3: Async Enrichment Worker (1 hour)

**File**: `backend/app/services/enrichment_worker.py`

**What to Change**:
1. Create new async enrichment method
2. Use `asyncio.gather()` to process multiple movies concurrently
3. Keep scheduler synchronous (FastAPI startup will handle it)

**Code Structure**:

```python
import asyncio
from typing import List

class EnrichmentWorker:
    """Background worker with async support"""

    # NEW ASYNC METHOD
    async def enrich_session_async(
        self,
        session_id: str,
        storage: "StorageService"
    ) -> None:
        """Async enrich all unenriched movies in a session (10 concurrent)"""
        try:
            # Get all unenriched movies
            unenriched_movies = storage.get_unenriched_movies(session_id)

            if not unenriched_movies:
                logger.info(f"Session {session_id}: No unenriched movies, marking complete")
                storage.update_session_status(session_id, "completed")
                return

            logger.info(
                f"Session {session_id}: Enriching {len(unenriched_movies)} movies "
                f"(async, 10 concurrent)"
            )

            # Process in batches of 10
            batch_size = 10
            for batch_start in range(0, len(unenriched_movies), batch_size):
                batch = unenriched_movies[batch_start:batch_start + batch_size]

                # Create async tasks for all movies in batch
                tasks = [
                    self._enrich_movie_async(movie, storage, session_id)
                    for movie in batch
                ]

                # Wait for all tasks in batch to complete
                await asyncio.gather(*tasks, return_exceptions=True)

            # Mark session as complete
            storage.update_session_status(session_id, "completed")
            logger.info(f"Session {session_id}: Async enrichment complete")

        except Exception as e:
            logger.error(
                f"Unexpected error in async enrichment for {session_id}: {str(e)}",
                exc_info=True
            )

    # NEW ASYNC HELPER METHOD
    async def _enrich_movie_async(
        self,
        movie,
        storage: "StorageService",
        session_id: str
    ) -> None:
        """Async enrich a single movie"""
        try:
            # Get TMDB enrichment data (async)
            enrichment_data = await self.tmdb_client.enrich_movie_async(
                title=movie.title,
                year=movie.year
            )

            if enrichment_data:
                storage.update_movie_enrichment(
                    movie_id=movie.id,
                    tmdb_data=enrichment_data
                )
                logger.debug(
                    f"Enriched async: {movie.title} "
                    f"(TMDB ID {enrichment_data.get('tmdb_id')})"
                )
            else:
                logger.warning(f"Not found in TMDB: {movie.title} ({movie.year})")

        except Exception as e:
            logger.error(f"Error enriching movie {movie.title}: {str(e)}")

        finally:
            # Always update progress
            try:
                storage.increment_enriched_count(session_id)
            except Exception as e:
                logger.error(f"Error updating progress: {str(e)}")

    # UPDATE EXISTING METHOD
    def enrich_sessions(self) -> None:
        """Main scheduler job (still sync, runs async enrichment)"""
        db = self.db_session_factory()

        try:
            from app.services.storage import StorageService
            storage = StorageService(db)

            sessions = storage.get_enriching_sessions()

            if not sessions:
                logger.debug("No sessions to enrich")
                return

            logger.info(f"Found {len(sessions)} session(s) to enrich")

            # Run async enrichment for each session
            for session in sessions:
                try:
                    # Create and run async enrichment
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(
                        self.enrich_session_async(session.id, storage)
                    )
                    loop.close()

                except Exception as e:
                    logger.error(
                        f"Error enriching session {session.id}: {str(e)}",
                        exc_info=True
                    )

        except Exception as e:
            logger.error(f"Unexpected error in enrich_sessions: {str(e)}", exc_info=True)
        finally:
            db.close()
```

**Key Points**:
- Processes 10 movies concurrently per batch
- Batches handled sequentially (safe for database)
- Total time for 50 movies: ~2-3 seconds (50/10 batches × 350ms per batch)
- Keeps scheduler synchronous (no need to change to AsyncIOScheduler)
- Creates fresh event loop for each run (scheduler context)

**Testing**: See Part 5

**Time**: 1 hour
- 40 min: Write async enrichment methods
- 15 min: Test and debug
- 5 min: Verify database consistency

---

### Part 4: Update Dependencies & Imports (30 minutes)

**Files to Update**:

1. **`backend/requirements.txt`** or **`backend/pyproject.toml`**
   ```
   aiohttp==3.9.1
   ```

2. **`backend/app/services/tmdb_client.py`** (import section)
   ```python
   import aiohttp
   import asyncio
   from concurrent.futures import ThreadPoolExecutor
   ```

3. **`backend/app/services/enrichment_worker.py`** (import section)
   ```python
   import asyncio
   ```

4. **`backend/main.py`** (if starting fresh event loop)
   - Usually already handles this, but verify

**Time**: 30 minutes
- 10 min: Review and update requirements
- 10 min: Add imports to files
- 10 min: Test imports work
- ✓ No breaking changes if backward compatibility maintained

---

### Part 5: Comprehensive Testing (1.5 hours)

**Files to Update**:

**`backend/tests/test_tmdb_async.py`** (NEW FILE)
```python
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.tmdb_client import TMDBClient

class TestTMDBAsyncClient:
    """Test async TMDB client methods"""

    @pytest.fixture
    def tmdb_client(self):
        return TMDBClient(api_key="test_key_123")

    @pytest.mark.asyncio
    async def test_search_movie_async_success(self, tmdb_client):
        """Test async movie search succeeds"""
        mock_response = {
            "results": [{
                "id": 603,
                "title": "The Matrix",
                "release_date": "1999-03-31"
            }]
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.status = 200
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(
                return_value=mock_response
            )

            result = await tmdb_client.search_movie_async("The Matrix", 1999)
            assert "results" in result
            assert len(result["results"]) > 0

    @pytest.mark.asyncio
    async def test_enrich_movie_async_success(self, tmdb_client):
        """Test async movie enrichment"""
        # Mock search response
        search_response = {
            "results": [{
                "id": 603,
                "title": "The Matrix",
                "release_date": "1999-03-31"
            }]
        }

        # Mock details response
        details_response = {
            "id": 603,
            "title": "The Matrix",
            "runtime": 136,
            "genres": [{"id": 28, "name": "Action"}],
            "credits": {
                "crew": [
                    {"name": "Lana Wachowski", "job": "Director"},
                    {"name": "Lilly Wachowski", "job": "Director"}
                ],
                "cast": [
                    {"name": "Keanu Reeves"},
                    {"name": "Laurence Fishburne"}
                ]
            },
            "vote_average": 8.7
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            # Setup mock for both search and details calls
            async_mock_search = AsyncMock(return_value=search_response)
            async_mock_details = AsyncMock(return_value=details_response)

            mock_get.return_value.__aenter__.return_value.status = 200
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(
                side_effect=[search_response, details_response]
            )

            result = await tmdb_client.enrich_movie_async("The Matrix", 1999)

            assert result is not None
            assert result["tmdb_id"] == 603
            assert result["title"] == "The Matrix"
            assert result["runtime"] == 136
            assert "Action" in result["genres"]

    @pytest.mark.asyncio
    async def test_enrich_movie_async_not_found(self, tmdb_client):
        """Test async enrichment when movie not found"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.status = 200
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(
                return_value={"results": []}
            )

            result = await tmdb_client.enrich_movie_async("NonExistentMovie", 2099)
            assert result is None


class TestAsyncConcurrency:
    """Test concurrent enrichment"""

    @pytest.mark.asyncio
    async def test_concurrent_enrichment_10_movies(self, tmdb_client):
        """Test that 10 movies can be enriched concurrently"""
        movies = [f"Movie {i}" for i in range(10)]

        # Mock all requests
        mock_result = {
            "tmdb_id": 1,
            "title": "Test",
            "genres": [],
            "runtime": 100
        }

        with patch.object(
            tmdb_client,
            'enrich_movie_async',
            new_callable=AsyncMock,
            return_value=mock_result
        ):
            # Enrich all 10 concurrently
            tasks = [
                tmdb_client.enrich_movie_async(movie)
                for movie in movies
            ]
            results = await asyncio.gather(*tasks)

            assert len(results) == 10
            assert all(r is not None for r in results)
```

**`backend/tests/test_enrichment_async.py`** (NEW FILE)
```python
import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.enrichment_worker import EnrichmentWorker
from app.services.tmdb_client import TMDBClient

class TestEnrichmentWorkerAsync:
    """Test async enrichment worker"""

    @pytest.fixture
    def worker(self):
        mock_db_factory = MagicMock()
        mock_tmdb = MagicMock(spec=TMDBClient)

        worker = EnrichmentWorker(mock_tmdb, mock_db_factory)
        return worker

    @pytest.mark.asyncio
    async def test_enrich_session_async_processes_10_concurrent(self, worker):
        """Test that session enrichment processes 10 movies concurrently"""
        # Create 50 mock movies
        mock_movies = [
            MagicMock(id=i, title=f"Movie {i}", year=2020)
            for i in range(50)
        ]

        mock_storage = MagicMock()
        mock_storage.get_unenriched_movies.return_value = mock_movies

        # Mock the enrichment to return quickly
        with patch.object(
            worker.tmdb_client,
            'enrich_movie_async',
            new_callable=AsyncMock,
            return_value={"tmdb_id": 1, "title": "Test"}
        ):
            await worker.enrich_session_async("session-123", mock_storage)

        # Verify all movies were processed
        assert mock_storage.increment_enriched_count.call_count == 50
        assert mock_storage.update_session_status.call_count == 1

    @pytest.mark.asyncio
    async def test_enrich_session_async_empty_session(self, worker):
        """Test enrichment with no movies"""
        mock_storage = MagicMock()
        mock_storage.get_unenriched_movies.return_value = []

        await worker.enrich_session_async("session-123", mock_storage)

        # Should mark complete immediately
        mock_storage.update_session_status.assert_called_with(
            "session-123", "completed"
        )

    @pytest.mark.asyncio
    async def test_enrich_session_async_handles_errors(self, worker):
        """Test that enrichment continues on individual movie errors"""
        # Create 3 movies
        mock_movies = [
            MagicMock(id=1, title="Movie 1", year=2020),
            MagicMock(id=2, title="Movie 2", year=2020),
            MagicMock(id=3, title="Movie 3", year=2020),
        ]

        mock_storage = MagicMock()
        mock_storage.get_unenriched_movies.return_value = mock_movies

        # Make second movie fail
        side_effects = [
            {"tmdb_id": 1},
            Exception("API Error"),
            {"tmdb_id": 3}
        ]

        with patch.object(
            worker.tmdb_client,
            'enrich_movie_async',
            new_callable=AsyncMock,
            side_effect=side_effects
        ):
            # Should not raise, should handle gracefully
            await worker.enrich_session_async("session-123", mock_storage)

        # All 3 should have progress incremented despite error
        assert mock_storage.increment_enriched_count.call_count == 3
```

**Update Existing Tests**: `backend/tests/test_api_endpoints.py`

Add smoke test for new async functionality:
```python
class TestAsyncEnrichment:
    """Test async enrichment integration"""

    def test_upload_with_async_enrichment(self, client, valid_csv_data):
        """Test that upload works with async enrichment"""
        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        assert response.status_code == 201
        data = response.json()
        assert data["session_id"]
        assert data["status"] in ["enriching", "completed"]
```

**Time**: 1.5 hours
- 45 min: Write async client tests (8 tests)
- 30 min: Write enrichment worker tests (4 tests)
- 15 min: Add integration tests
- ✓ Use `pytest-asyncio` for async test support

---

### Part 6: Integration & Verification (1 hour)

**Checklist**:

- [ ] All imports resolve correctly
- [ ] No breaking changes to existing code
- [ ] Backward compatibility maintained (sync methods still work)
- [ ] Event loop handling correct
- [ ] Database transactions safe
- [ ] Rate limiting working (10 concurrent requests)
- [ ] Error handling robust

**Test Sequence**:

1. **Run unit tests**
   ```bash
   pytest backend/tests/test_tmdb_async.py -v
   pytest backend/tests/test_enrichment_async.py -v
   ```

2. **Run integration tests**
   ```bash
   pytest backend/tests/test_api_endpoints.py::TestAsyncEnrichment -v
   ```

3. **Run full test suite**
   ```bash
   pytest backend/tests/ --cov=app --cov-report=html
   ```

4. **Manual testing**
   - Upload CSV via `/test` page
   - Monitor backend logs for enrichment
   - Check that 50 movies complete in 2-3 seconds
   - Verify no APScheduler warnings

5. **Performance testing**
   ```bash
   # Time the enrichment
   # Watch backend logs:
   # Should see: "Enriching 50 movies (async, 10 concurrent)"
   # Should complete in ~2-3 seconds
   ```

**Time**: 1 hour
- 15 min: Run all test suites
- 20 min: Manual testing via `/test` page
- 15 min: Performance verification
- 10 min: Bug fixes if needed

---

## Summary: Parts & Timeline

| Part | Component | Time | Effort | Priority |
|------|-----------|------|--------|----------|
| 1 | Dependencies | 15 min | Trivial | ✅ First |
| 2 | Async TMDB Client | 1.5 h | Medium | ✅ Core |
| 3 | Async Enrichment Worker | 1 h | Medium | ✅ Core |
| 4 | Imports & Config | 30 min | Easy | ✅ Second |
| 5 | Comprehensive Testing | 1.5 h | Medium | ✅ Critical |
| 6 | Integration & Verification | 1 h | Medium | ✅ Final |
| | **TOTAL** | **5.5 hours** | **Medium** | |

---

## Detailed Timeline

### Day 1 - Core Implementation (3.5 hours)

**1:00 - 1:15 (15 min)**: Part 1 - Dependencies
- Check if `aiohttp` installed
- Update `requirements.txt`
- Verify imports

**1:15 - 3:00 (1:45)**: Part 2 - Async TMDB Client
- Create async search method
- Create async details method
- Create async enrich method
- Keep sync wrapper
- Test locally

**3:00 - 4:00 (1:00)**: Part 3 - Async Enrichment Worker
- Create async enrichment method
- Implement batch processing (10 concurrent)
- Update main scheduler method
- Verify database safety

**4:00 - 4:30 (0:30)**: Part 4 - Imports & Config
- Update all imports
- Verify no import errors
- Check for syntax issues

### Day 2 - Testing & Verification (2 hours)

**9:00 - 10:00 (1:00)**: Part 5 - Testing
- Write async client tests (8 tests)
- Write enrichment worker tests (4 tests)
- Write integration tests
- Run full test suite

**10:00 - 11:00 (1:00)**: Part 6 - Integration & Verification
- Manual testing via `/test` page
- Performance measurement
- Log verification
- Bug fixes if needed

---

## Expected Results

### Performance Improvement
```
BEFORE (Sequential):
- 1 movie: 350ms
- 10 movies: 3.5s
- 50 movies: 17.5s ❌ Exceeds 10s interval

AFTER (Async Concurrent - 10 at a time):
- 1 movie: 350ms (same)
- 10 movies: 350ms (10x faster!)
- 50 movies: 2-3s ✅ Fits in 10s interval
```

### APScheduler Warnings
- **Before**: Warnings every 10 seconds during enrichment
- **After**: No warnings - enrichment completes within interval

### Test Coverage
- **Before**: 41% overall, 76% session API
- **After**: ~50-55% overall, 85%+ async components

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Event loop conflicts | Medium | Use `asyncio.new_event_loop()` for scheduler context |
| Database concurrency | Low | Process batches sequentially, movies concurrently |
| TMDB rate limiting | Low | Use `asyncio.Semaphore(10)` to respect rate limit |
| Backward compatibility | Low | Keep sync `enrich_movie()` method as wrapper |
| Error handling | Medium | Comprehensive try/except in async methods |

---

## Prerequisites

- Python 3.8+ (for asyncio)
- `aiohttp` library (install from requirements)
- `pytest-asyncio` for testing (likely already installed)
- FastAPI (already in project)

---

## Post-Implementation

After completing all parts:

1. **Update Documentation**
   - Add async enrichment section to README
   - Update ENRICHMENT_ARCHITECTURE_ANALYSIS.md with "Implemented" status

2. **Monitor Performance**
   - Track enrichment times in logs
   - Compare before/after metrics
   - Document actual performance gains

3. **Consider Future Improvements**
   - Connection pooling with `aiohttp.TCPConnector`
   - Custom retry logic with exponential backoff
   - Metrics/monitoring for API performance

4. **Share Results**
   - Team review of changes
   - Performance metrics report
   - Celebrate 5-10x speed improvement! 🎉

---

## Git Commit Strategy

Commit in logical chunks:

```bash
# Commit 1: Dependencies
git commit -m "Add aiohttp to dependencies for async TMDB client"

# Commit 2: Async TMDB Client
git commit -m "Implement async TMDB client with concurrent requests"

# Commit 3: Async Enrichment Worker
git commit -m "Convert enrichment worker to async with 10 concurrent movies"

# Commit 4: Tests
git commit -m "Add comprehensive tests for async enrichment (12 new tests)"

# Commit 5: Documentation
git commit -m "Update documentation with async enrichment implementation"
```

---

**Status**: ✅ Ready for Implementation
**Complexity**: Medium
**Estimated Total Time**: 4-5.5 hours (including breaks)
**Expected Impact**: 5-10x enrichment speed improvement + zero APScheduler warnings
