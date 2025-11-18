# Option A: Implementation Guide - Step by Step

This guide walks you through implementing Option A: **Simplify Current Version with Async SQLAlchemy**.

**Approach:** Clean rewrite of broken services while keeping database schema intact.

---

## Phase 1: Setup & Dependencies (30 minutes)

### Step 1.1: Update requirements.txt

**File:** `backend/requirements.txt`

```bash
# FastAPI & Server
fastapi==0.121.0
uvicorn[standard]==0.27.0
python-dotenv==1.0.1

# Database - ASYNC
sqlalchemy[asyncio]==2.0.25
asyncpg==0.29.0
psycopg2-binary==2.9.9
alembic==1.13.1

# Data processing
pandas==2.1.4
numpy==1.26.3

# HTTP - ASYNC
aiohttp==3.9.1

# Request validation
pydantic==2.5.3
pydantic-settings==2.1.0

# Testing
pytest==7.4.3
pytest-asyncio==0.22.1
pytest-cov==4.1.0
httpx==0.25.2
```

**Why these changes:**
- `sqlalchemy[asyncio]` - Async SQLAlchemy (replaces sync SQLAlchemy)
- `asyncpg` - Native async PostgreSQL driver
- `aiohttp` - Async HTTP client (replaces `requests`)
- Remove `APScheduler` completely

**Install:**
```bash
cd backend
pip install -r requirements.txt
```

### Step 1.2: Create .env.test File

**File:** `backend/.env.test`

```env
# Database (SQLite for testing)
DATABASE_URL=sqlite+aiosqlite:///test_letterboxd.db

# TMDB API (use real API key)
TMDB_API_KEY=your_real_tmdb_api_key_here

# Logging
LOG_LEVEL=DEBUG

# Testing flags
TESTING=True
```

**Keep your main .env unchanged** - it still uses PostgreSQL for development.

---

## Phase 2: Database Setup (30 minutes)

### Step 2.1: Update db/session.py (Async Engine)

**File:** `backend/app/db/session.py`

**Replace entire file with:**

```python
"""
Database connection setup for async SQLAlchemy.

Key changes from sync version:
- Uses AsyncEngine instead of Engine
- AsyncSessionLocal for async context managers
- No connection pool exhaustion issues (async-native)
"""

import logging
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    AsyncEngine
)
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os

logger = logging.getLogger(__name__)

# Get database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://letterboxduser:securepassword@db:5432/letterboxddb"
)

# Determine if using SQLite for testing
is_sqlite = "sqlite" in DATABASE_URL


def create_engine_instance() -> AsyncEngine:
    """Create async engine with appropriate settings."""

    engine_kwargs = {
        "echo": os.getenv("SQL_ECHO", "False").lower() == "true",
        "pool_pre_ping": True,  # Validate connections before using
        "future": True,  # SQLAlchemy 2.0 style
    }

    # SQLite-specific settings
    if is_sqlite:
        engine_kwargs.update({
            "connect_args": {"check_same_thread": False},
            "poolclass": NullPool,  # SQLite doesn't handle connection pooling well
        })
    else:
        # PostgreSQL-specific settings
        engine_kwargs.update({
            "pool_size": 20,           # Base pool size
            "max_overflow": 30,        # Max overflow beyond pool_size
            "pool_recycle": 3600,      # Recycle connections every hour
            "echo_pool": False,        # Set True to debug connection pool
        })

    logger.info(f"Creating async engine with: {DATABASE_URL}")
    return create_async_engine(DATABASE_URL, **engine_kwargs)


# Create engine instance
engine = create_engine_instance()

# Create AsyncSessionLocal factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Don't expire objects after commit
    autoflush=False,         # Explicit flushing only
)


async def get_db() -> AsyncSession:
    """
    Dependency for FastAPI to get async session.

    Usage:
        async def my_endpoint(db: AsyncSession = Depends(get_db)):
            # Use db
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables (run on startup)."""
    from app.models.database import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database tables initialized")


async def close_db():
    """Close database connections (run on shutdown)."""
    await engine.dispose()
    logger.info("Database connections closed")
```

**Key changes:**
- `create_async_engine()` instead of `create_engine()`
- `AsyncSession` instead of `Session`
- `AsyncSessionLocal` factory for async context managers
- SQLite support for testing with `NullPool`
- PostgreSQL pooling for production

---

## Phase 3: Services Rewrite (2-3 hours)

### Step 3.1: Rewrite tmdb_client.py (Async HTTP)

**File:** `backend/app/services/tmdb_client.py`

**Replace entire file with:**

```python
"""
TMDB API client with async HTTP, retry logic, and rate limiting.

Key changes from current:
- Uses aiohttp instead of requests (async)
- Retry decorator with exponential backoff
- Rate limiting semaphore (40 req/10s)
- In-memory cache with TTL
"""

import aiohttp
import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps
import time

logger = logging.getLogger(__name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Rate limiting: 40 requests per 10 seconds = 4 requests/second
RATE_LIMIT_REQUESTS = 40
RATE_LIMIT_SECONDS = 10


def retry_with_backoff(max_retries: int = 3):
    """
    Decorator for retrying async functions with exponential backoff.

    Retries on network errors, but not on 404 (movie not found).
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except aiohttp.ClientError as e:
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt  # 1s, 2s, 4s
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed for {func.__name__}: {e}. "
                            f"Retrying in {wait_time}s..."
                        )
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(
                            f"All {max_retries} attempts failed for {func.__name__}: {e}"
                        )
                        raise
                except Exception as e:
                    # Non-network errors, don't retry
                    logger.error(f"Unexpected error in {func.__name__}: {e}")
                    raise
        return wrapper
    return decorator


class CacheEntry:
    """Simple cache entry with TTL."""
    def __init__(self, data: Dict[str, Any], ttl_minutes: int = 10):
        self.data = data
        self.created_at = datetime.now()
        self.ttl = timedelta(minutes=ttl_minutes)

    def is_valid(self) -> bool:
        """Check if cache entry is still valid."""
        return datetime.now() < self.created_at + self.ttl


class TMDBClient:
    """
    Async TMDB API client with rate limiting and retry logic.
    """

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.cache: Dict[str, CacheEntry] = {}
        self.rate_limiter = asyncio.Semaphore(4)  # 4 concurrent requests
        self.request_times: list = []  # For rate limit tracking

        logger.info("TMDBClient initialized")

    async def start(self):
        """Start HTTP session (call on app startup)."""
        if not self.session:
            self.session = aiohttp.ClientSession()
            logger.info("TMDB HTTP session started")

    async def stop(self):
        """Stop HTTP session (call on app shutdown)."""
        if self.session:
            await self.session.close()
            logger.info("TMDB HTTP session closed")

    async def _rate_limit(self):
        """Enforce rate limiting: 40 requests per 10 seconds."""
        async with self.rate_limiter:
            # Clean up old request times
            now = time.time()
            self.request_times = [t for t in self.request_times if now - t < RATE_LIMIT_SECONDS]

            # If we've made 40 requests in last 10 seconds, wait
            if len(self.request_times) >= RATE_LIMIT_REQUESTS:
                wait_time = RATE_LIMIT_SECONDS - (now - self.request_times[0])
                if wait_time > 0:
                    logger.debug(f"Rate limit: waiting {wait_time:.2f}s")
                    await asyncio.sleep(wait_time)

            # Record this request
            self.request_times.append(time.time())

    @retry_with_backoff(max_retries=3)
    async def search_movie(
        self,
        title: str,
        year: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Search for movie by title and optional year.

        Returns first result or None if not found.
        """
        # Check cache first
        cache_key = f"search_{title}_{year}"
        if cache_key in self.cache and self.cache[cache_key].is_valid():
            logger.debug(f"Cache hit for search: {title} ({year})")
            return self.cache[cache_key].data

        await self._rate_limit()

        params = {
            "api_key": TMDB_API_KEY,
            "query": title,
        }

        if year:
            params["year"] = year

        try:
            async with self.session.get(
                f"{TMDB_BASE_URL}/search/movie",
                params=params,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    results = data.get("results", [])

                    if results:
                        first_result = results[0]
                        logger.info(
                            f"Found movie: {title} ({year}) → "
                            f"TMDB ID {first_result.get('id')}"
                        )
                        # Cache result
                        self.cache[cache_key] = CacheEntry(first_result)
                        return first_result
                    else:
                        logger.warning(f"Movie not found: {title} ({year})")
                        return None

                elif response.status == 429:
                    # Rate limited - let retry decorator handle it
                    raise aiohttp.ClientError("Rate limited by TMDB (429)")

                else:
                    logger.error(f"TMDB API error {response.status}: {await response.text()}")
                    raise aiohttp.ClientError(f"TMDB API returned {response.status}")

        except asyncio.TimeoutError:
            logger.error(f"TMDB search timeout for {title} ({year})")
            raise aiohttp.ClientError("TMDB search timeout")

    @retry_with_backoff(max_retries=3)
    async def get_movie_details(self, tmdb_id: int) -> Optional[Dict[str, Any]]:
        """
        Get detailed movie information.
        """
        # Check cache
        cache_key = f"details_{tmdb_id}"
        if cache_key in self.cache and self.cache[cache_key].is_valid():
            logger.debug(f"Cache hit for movie details: {tmdb_id}")
            return self.cache[cache_key].data

        await self._rate_limit()

        params = {"api_key": TMDB_API_KEY}

        try:
            async with self.session.get(
                f"{TMDB_BASE_URL}/movie/{tmdb_id}",
                params=params,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.debug(f"Fetched details for TMDB ID {tmdb_id}")
                    self.cache[cache_key] = CacheEntry(data)
                    return data

                elif response.status == 404:
                    logger.warning(f"Movie not found on TMDB: ID {tmdb_id}")
                    return None

                else:
                    raise aiohttp.ClientError(f"TMDB API returned {response.status}")

        except asyncio.TimeoutError:
            logger.error(f"TMDB details timeout for ID {tmdb_id}")
            raise aiohttp.ClientError("TMDB details timeout")

    @retry_with_backoff(max_retries=3)
    async def get_movie_credits(self, tmdb_id: int) -> Optional[Dict[str, Any]]:
        """
        Get cast and crew for movie.
        """
        # Check cache
        cache_key = f"credits_{tmdb_id}"
        if cache_key in self.cache and self.cache[cache_key].is_valid():
            logger.debug(f"Cache hit for movie credits: {tmdb_id}")
            return self.cache[cache_key].data

        await self._rate_limit()

        params = {"api_key": TMDB_API_KEY}

        try:
            async with self.session.get(
                f"{TMDB_BASE_URL}/movie/{tmdb_id}/credits",
                params=params,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.debug(f"Fetched credits for TMDB ID {tmdb_id}")
                    self.cache[cache_key] = CacheEntry(data)
                    return data

                elif response.status == 404:
                    logger.warning(f"Credits not found for TMDB ID {tmdb_id}")
                    return None

                else:
                    raise aiohttp.ClientError(f"TMDB API returned {response.status}")

        except asyncio.TimeoutError:
            logger.error(f"TMDB credits timeout for ID {tmdb_id}")
            raise aiohttp.ClientError("TMDB credits timeout")

    async def enrich_movie_async(
        self,
        title: str,
        year: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Complete enrichment: search → details → credits.

        Returns enrichment data or None on failure.
        """
        try:
            # Step 1: Search for movie
            movie = await self.search_movie(title, year)
            if not movie:
                logger.warning(f"Could not enrich: movie not found ({title})")
                return None

            tmdb_id = movie.get("id")

            # Step 2: Get details
            details = await self.get_movie_details(tmdb_id)
            if not details:
                logger.warning(f"Could not get details for TMDB ID {tmdb_id}")
                return None

            # Step 3: Get credits
            credits = await self.get_movie_credits(tmdb_id)
            if not credits:
                logger.warning(f"Could not get credits for TMDB ID {tmdb_id}")
                credits = {}

            # Combine all data
            enrichment = {
                "tmdb_id": tmdb_id,
                "genres": [g.get("name") for g in details.get("genres", [])],
                "runtime": details.get("runtime"),
                "release_date": details.get("release_date"),
                "imdb_id": details.get("imdb_id"),
                "imdb_rating": None,  # Not from TMDB directly
                "director": self._extract_director(credits.get("crew", [])),
                "cast": self._extract_cast(credits.get("cast", [])),
            }

            logger.info(f"Enriched movie {title}: {enrichment['tmdb_id']}")
            return enrichment

        except Exception as e:
            logger.error(f"Enrichment failed for {title}: {e}")
            return None

    @staticmethod
    def _extract_director(crew: list) -> Optional[str]:
        """Extract director from crew list."""
        for person in crew:
            if person.get("job") == "Director":
                return person.get("name")
        return None

    @staticmethod
    def _extract_cast(cast: list) -> list:
        """Extract top 10 cast members."""
        return [person.get("name") for person in cast[:10]]

    def clear_cache(self):
        """Clear entire cache."""
        self.cache.clear()
        logger.info("TMDB cache cleared")
```

**Key improvements:**
- Async/await throughout (no threads)
- Retry with exponential backoff
- Rate limiting (40 req/10s)
- In-memory cache with TTL
- Better error logging
- Clear separation of concerns

---

### Step 3.2: Rewrite enrichment_worker.py (No APScheduler)

**File:** `backend/app/services/enrichment_worker.py`

**Replace entire file with:**

```python
"""
Background enrichment worker using async event loop (no APScheduler).

Key changes:
- No APScheduler (use native async instead)
- Single async task (run_loop)
- Explicit batch processing with rate limiting
- Atomic progress updates (no race conditions)
- Full session lifecycle management
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.database import Session as SessionModel, Movie
from app.services.tmdb_client import TMDBClient
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Generate trace ID for entire enrichment run
def get_trace_id(session_id: uuid.UUID) -> str:
    """Create short trace ID for logging."""
    return str(session_id)[:8]


class EnrichmentWorker:
    """
    Background enrichment worker that runs continuously.

    Replaces APScheduler with a simple async loop.
    """

    def __init__(self, tmdb_client: TMDBClient):
        self.tmdb_client = tmdb_client
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self.poll_interval = 10  # Check for enriching sessions every 10 seconds

    async def start(self):
        """Start the background enrichment loop."""
        if self._running:
            logger.warning("Enrichment worker already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Enrichment worker started")

    async def stop(self):
        """Stop the background enrichment loop."""
        self._running = False
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=5)
            except asyncio.TimeoutError:
                logger.warning("Enrichment worker stop timeout")
                self._task.cancel()
        logger.info("Enrichment worker stopped")

    async def _run_loop(self):
        """
        Main enrichment loop.

        Every poll_interval seconds:
        1. Query sessions with status='enriching'
        2. For each session, process unenriched movies
        3. Batch them, TMDB enrich concurrently
        4. Update session status when done
        """
        logger.info("Enrichment loop started")

        while self._running:
            try:
                await self._process_enriching_sessions()
                await asyncio.sleep(self.poll_interval)

            except Exception as e:
                logger.error(f"Error in enrichment loop: {e}", exc_info=True)
                await asyncio.sleep(self.poll_interval)

    async def _process_enriching_sessions(self):
        """Process all sessions currently in 'enriching' state."""
        async with AsyncSessionLocal() as db:
            try:
                # Query sessions that need enrichment
                sessions = await db.execute(
                    """
                    SELECT * FROM sessions
                    WHERE status = 'enriching'
                    AND expires_at > NOW()
                    """
                )
                enriching_sessions = sessions.fetchall()

                if not enriching_sessions:
                    logger.debug("No sessions to enrich")
                    return

                logger.info(f"Found {len(enriching_sessions)} enriching session(s)")

                # Process each session
                for session in enriching_sessions:
                    await self._enrich_session(session[0])  # session_id

            except Exception as e:
                logger.error(f"Error processing sessions: {e}", exc_info=True)

    async def _enrich_session(self, session_id: uuid.UUID):
        """
        Enrich all unenriched movies for a session.

        Process in batches of 10 with rate limiting.
        """
        trace_id = get_trace_id(session_id)

        async with AsyncSessionLocal() as db:
            try:
                logger.info(f"[{trace_id}] Starting enrichment")

                # Fetch session
                session = await db.get(SessionModel, session_id)
                if not session:
                    logger.error(f"[{trace_id}] Session not found")
                    return

                # Extend session expiry (so it doesn't expire during enrichment)
                session.expires_at = datetime.utcnow() + timedelta(days=30)
                await db.commit()
                logger.debug(f"[{trace_id}] Extended session expiry")

                # Get unenriched movies
                movies = await self._get_unenriched_movies(db, session_id)
                if not movies:
                    logger.info(f"[{trace_id}] No unenriched movies")
                    await self._update_session_status(db, session_id, 'completed')
                    return

                logger.info(f"[{trace_id}] Found {len(movies)} unenriched movies")

                # Process in batches of 10
                batch_size = 10
                total_batches = (len(movies) + batch_size - 1) // batch_size

                for batch_num in range(total_batches):
                    if not self._running:
                        logger.warning(f"[{trace_id}] Enrichment stopped")
                        break

                    # Get batch
                    start_idx = batch_num * batch_size
                    end_idx = start_idx + batch_size
                    batch = movies[start_idx:end_idx]

                    logger.info(
                        f"[{trace_id}] Batch {batch_num + 1}/{total_batches}: "
                        f"Enriching {len(batch)} movies"
                    )

                    # Enrich batch (concurrent)
                    await self._enrich_batch(db, session_id, batch, trace_id)

                    # Get current progress
                    session = await db.get(SessionModel, session_id)
                    logger.info(
                        f"[{trace_id}] Progress: {session.enriched_count}/{session.total_movies}"
                    )

                    # Rate limiting (wait before next batch to respect TMDB limits)
                    if batch_num < total_batches - 1:
                        logger.debug(f"[{trace_id}] Rate limiting: waiting 2.5s")
                        await asyncio.sleep(2.5)

                # Mark session as completed
                logger.info(f"[{trace_id}] Enrichment complete")
                await self._update_session_status(db, session_id, 'completed')

            except Exception as e:
                logger.error(f"[{trace_id}] Error enriching session: {e}", exc_info=True)
                await self._update_session_status(db, session_id, 'failed', error_msg=str(e))

    async def _enrich_batch(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        movies: List[Movie],
        trace_id: str
    ):
        """
        Enrich batch of movies concurrently.

        IMPORTANT: All TMDB calls are concurrent (non-blocking).
        DB updates happen after all TMDB calls complete.
        """
        # Create concurrent tasks for TMDB enrichment
        tasks = [
            self.tmdb_client.enrich_movie_async(movie.title, movie.year)
            for movie in movies
        ]

        # Wait for all TMDB calls (concurrent)
        enrichment_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results and update DB
        successful = 0
        for movie, enrichment in zip(movies, enrichment_results):
            if isinstance(enrichment, Exception):
                logger.warning(f"[{trace_id}] Movie {movie.title}: {enrichment}")
                continue

            if enrichment:
                try:
                    # Update movie with TMDB data
                    await self._save_movie_enrichment(db, movie.id, enrichment)
                    successful += 1
                    logger.debug(f"[{trace_id}] Enriched: {movie.title}")
                except Exception as e:
                    logger.error(f"[{trace_id}] Failed to save {movie.title}: {e}")
            else:
                logger.warning(f"[{trace_id}] No TMDB data for {movie.title}")

        # Update progress counter (atomic)
        try:
            await self._increment_progress(db, session_id, successful)
            logger.debug(f"[{trace_id}] Progress incremented by {successful}")
        except Exception as e:
            logger.error(f"[{trace_id}] Failed to update progress: {e}")

    async def _get_unenriched_movies(
        self,
        db: AsyncSession,
        session_id: uuid.UUID
    ) -> List[Movie]:
        """Get all unenriched movies for session."""
        try:
            from sqlalchemy import select

            result = await db.execute(
                select(Movie).where(
                    (Movie.session_id == session_id) &
                    (Movie.tmdb_enriched == False)
                )
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching unenriched movies: {e}")
            return []

    async def _save_movie_enrichment(
        self,
        db: AsyncSession,
        movie_id: int,
        enrichment: dict
    ):
        """Save TMDB enrichment data to database."""
        try:
            movie = await db.get(Movie, movie_id)
            if not movie:
                logger.warning(f"Movie {movie_id} not found")
                return

            # Update movie fields
            movie.tmdb_id = enrichment.get("tmdb_id")
            movie.genres = enrichment.get("genres", [])
            movie.runtime = enrichment.get("runtime")
            movie.tmdb_enriched = True
            # Add other fields as needed

            await db.commit()
        except Exception as e:
            await db.rollback()
            raise e

    async def _increment_progress(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        count: int = 1
    ):
        """Increment progress counter (atomic)."""
        try:
            session = await db.get(SessionModel, session_id)
            if session:
                session.enriched_count += count
                await db.commit()
        except Exception as e:
            await db.rollback()
            raise e

    async def _update_session_status(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        status: str,
        error_msg: Optional[str] = None
    ):
        """Update session status (explicit state transition)."""
        try:
            session = await db.get(SessionModel, session_id)
            if session:
                old_status = session.status
                session.status = status
                if error_msg:
                    session.error_message = error_msg
                await db.commit()
                logger.info(f"Session {session_id}: {old_status} → {status}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update session status: {e}")
```

**Key improvements:**
- No APScheduler (pure asyncio)
- Single async loop with `asyncio.create_task()`
- Batch processing with explicit delays
- Atomic progress updates (no race conditions)
- Full state lifecycle management
- Comprehensive logging with trace IDs

---

### Step 3.3: Update storage.py (Async DB operations)

**File:** `backend/app/services/storage.py`

This needs to be rewritten for async operations. **Replace entire file:**

```python
"""
Storage service for database operations (async).

All operations are async-safe and use AsyncSession.
"""

import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import Session as SessionModel, Movie

logger = logging.getLogger(__name__)


class StorageService:
    """Handle all database operations asynchronously."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(self, total_movies: int) -> uuid.UUID:
        """Create new session record."""
        session_id = uuid.uuid4()

        session = SessionModel(
            id=session_id,
            status='uploading',
            total_movies=total_movies,
            enriched_count=0,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30)
        )

        self.db.add(session)
        await self.db.commit()

        logger.info(f"Created session {session_id} with {total_movies} movies")
        return session_id

    async def store_movies(self, session_id: uuid.UUID, movies: List[Dict]):
        """Bulk insert movies into database."""
        try:
            movie_objects = [
                Movie(
                    session_id=session_id,
                    title=movie.get('title'),
                    year=movie.get('year'),
                    rating=movie.get('rating'),
                    watched_date=movie.get('watched_date'),
                    letterboxd_uri=movie.get('letterboxd_uri'),
                    tmdb_enriched=False,
                )
                for movie in movies
            ]

            self.db.add_all(movie_objects)
            await self.db.commit()

            logger.info(f"Stored {len(movie_objects)} movies for session {session_id}")

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error storing movies: {e}")
            raise

    async def get_session(self, session_id: uuid.UUID) -> Optional[SessionModel]:
        """Get session by ID."""
        result = await self.db.execute(
            select(SessionModel).where(SessionModel.id == session_id)
        )
        return result.scalars().first()

    async def get_session_movies(
        self,
        session_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Movie]:
        """Get movies for session (with pagination)."""
        result = await self.db.execute(
            select(Movie).where(Movie.session_id == session_id).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def update_session_status(self, session_id: uuid.UUID, status: str):
        """Update session status."""
        session = await self.get_session(session_id)
        if session:
            session.status = status
            await self.db.commit()
            logger.info(f"Updated session {session_id} status to {status}")

    async def extend_session_expiry(self, session_id: uuid.UUID):
        """Extend session expiry by 30 days."""
        session = await self.get_session(session_id)
        if session:
            session.expires_at = datetime.utcnow() + timedelta(days=30)
            await self.db.commit()
            logger.debug(f"Extended expiry for session {session_id}")
```

---

## Phase 4: Update main.py (Startup/Shutdown)

### Step 4.1: Update main.py

**File:** `backend/main.py`

Key changes: Add startup/shutdown hooks for enrichment worker, initialize async engine

```python
"""
FastAPI application entry point.

Startup:
1. Initialize TMDB client HTTP session
2. Initialize database engine
3. Start background enrichment worker

Shutdown:
1. Stop background enrichment worker
2. Close TMDB HTTP session
3. Close database connections
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.enrichment_worker import EnrichmentWorker
from app.services.tmdb_client import TMDBClient
from app.db.session import init_db, close_db
from app.api import upload, session

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
tmdb_client = None
enrichment_worker = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown lifecycle for FastAPI app.

    Replaces:
    @app.on_event("startup")
    @app.on_event("shutdown")
    """
    global tmdb_client, enrichment_worker

    # Startup
    logger.info("🚀 Starting Letterboxd Stats API")

    # Initialize database
    await init_db()
    logger.info("✓ Database initialized")

    # Initialize TMDB client
    tmdb_client = TMDBClient()
    await tmdb_client.start()
    logger.info("✓ TMDB client started")

    # Start enrichment worker
    enrichment_worker = EnrichmentWorker(tmdb_client)
    await enrichment_worker.start()
    logger.info("✓ Enrichment worker started")

    logger.info("✓ All services initialized")

    yield  # Application runs here

    # Shutdown
    logger.info("🛑 Shutting down")

    # Stop enrichment worker
    await enrichment_worker.stop()
    logger.info("✓ Enrichment worker stopped")

    # Close TMDB client
    await tmdb_client.stop()
    logger.info("✓ TMDB client closed")

    # Close database
    await close_db()
    logger.info("✓ Database closed")

    logger.info("✓ Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Letterboxd Stats",
    description="Transform Letterboxd data into interactive analytics",
    version="0.2.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router)
app.include_router(session.router)

# Health check
@app.get("/health")
async def health_check():
    """Check API health."""
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "enrichment": "running" if enrichment_worker._running else "stopped",
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
```

---

## Phase 5: Update API Endpoints

### Step 5.1: Update upload.py

**File:** `backend/app/api/upload.py`

Key change: Use AsyncSession instead of sync sessions

```python
"""
File upload endpoint.

POST /api/upload - Upload Letterboxd CSV files
"""

import logging
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.csv_parser import LetterboxdParser
from app.services.storage import StorageService
from app.schemas.upload import UploadResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload")
async def upload_files(
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload Letterboxd CSV files.

    Accepts:
    - watched.csv
    - ratings.csv
    - diary.csv
    - likes.csv

    Or a single ZIP containing all files.
    """
    try:
        # Validate files
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        # Parse files
        parser = LetterboxdParser()
        for file in files:
            content = await file.read()
            filename = file.filename.lower()

            if filename.endswith('watched.csv'):
                parser.parse_watched(content)
            elif filename.endswith('ratings.csv'):
                parser.parse_ratings(content)
            elif filename.endswith('diary.csv'):
                parser.parse_diary(content)
            elif filename.endswith('likes.csv'):
                parser.parse_likes(content)
            else:
                logger.warning(f"Skipping unrecognized file: {file.filename}")

        # Merge by Letterboxd URI
        movies = parser.to_storage_format()

        if not movies:
            raise HTTPException(status_code=400, detail="No movies found in files")

        logger.info(f"Parsed {len(movies)} movies")

        # Create session and store movies
        storage = StorageService(db)
        session_id = await storage.create_session(len(movies))
        await storage.store_movies(session_id, movies)

        # Update status to 'enriching' (signals background worker)
        await storage.update_session_status(session_id, 'enriching')

        return UploadResponse(
            session_id=str(session_id),
            status='enriching',
            total_movies=len(movies)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
```

### Step 5.2: Update session.py (Status/Movies endpoints)

**File:** `backend/app/api/session.py`

```python
"""
Session endpoints for progress and data retrieval.

GET /api/session/{session_id} - Get session status and progress
GET /api/session/{session_id}/movies - Get enriched movies
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.storage import StorageService
from app.schemas.session import SessionStatus, MovieResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["session"])


@router.get("/session/{session_id}")
async def get_session_status(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get session status and enrichment progress.

    Used by frontend for progress bar polling.
    """
    try:
        import uuid
        session_uuid = uuid.UUID(session_id)

        storage = StorageService(db)
        session = await storage.get_session(session_uuid)

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        return SessionStatus(
            status=session.status,
            enriched_count=session.enriched_count,
            total_movies=session.total_movies,
            progress_percent=(session.enriched_count / session.total_movies * 100)
            if session.total_movies > 0 else 0
        )

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/session/{session_id}/movies")
async def get_session_movies(
    session_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """
    Get enriched movies for session.

    Returns paginated list of movies with TMDB data.
    """
    try:
        import uuid
        session_uuid = uuid.UUID(session_id)

        storage = StorageService(db)
        session = await storage.get_session(session_uuid)

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        movies = await storage.get_session_movies(session_uuid, skip, limit)

        return [
            MovieResponse(
                title=m.title,
                year=m.year,
                rating=m.rating,
                genres=m.genres,
                runtime=m.runtime,
                tmdb_enriched=m.tmdb_enriched
            )
            for m in movies
        ]

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    except Exception as e:
        logger.error(f"Error getting movies: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

---

## Phase 6: Database Models (Minor Updates)

### Step 6.1: Update models/database.py

Add error_message field to Session model:

```python
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, UUID
from sqlalchemy.orm import declarative_base
import uuid
from datetime import datetime

Base = declarative_base()


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String(20), default='uploading')  # uploading, processing, enriching, completed, failed
    total_movies = Column(Integer, default=0)
    enriched_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    error_message = Column(Text, nullable=True)  # NEW: error details


class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey('sessions.id', ondelete='CASCADE'))
    title = Column(String(255))
    year = Column(Integer)
    rating = Column(Float, nullable=True)
    watched_date = Column(DateTime, nullable=True)
    letterboxd_uri = Column(String(255), unique=True)
    tmdb_enriched = Column(Boolean, default=False)
    tmdb_id = Column(Integer, nullable=True)
    genres = Column(JSON, nullable=True)
    runtime = Column(Integer, nullable=True)
    # Add other fields as needed
```

---

## Running Option A

### 1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### 2. Setup database (PostgreSQL or SQLite):
```bash
# For PostgreSQL (development)
# Ensure .env has: DATABASE_URL=postgresql+asyncpg://...

# For SQLite (testing)
# Use .env.test with: DATABASE_URL=sqlite+aiosqlite:///test.db
```

### 3. Start the server:
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Test the enrichment:
```bash
# Upload CSV files
curl -X POST http://localhost:8000/api/upload \
  -F "files=@watched.csv" \
  -F "files=@ratings.csv"

# Check progress
curl http://localhost:8000/api/session/{session_id}

# Get enriched movies
curl http://localhost:8000/api/session/{session_id}/movies
```

---

## Next Steps

1. Read **OPTION_A_TESTING.md** for comprehensive test cases
2. Read **OPTION_A_DEBUGGING.md** for logging and troubleshooting
3. Start implementing Phase 1, then Phase 2, etc.
4. Run tests after each phase

