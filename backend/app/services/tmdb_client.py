"""TMDB API client with async HTTP, retry logic, and rate limiting.

Key changes from current:
- Uses aiohttp instead of requests (async)
- Retry decorator with exponential backoff
- Rate limiting semaphore (40 req/10s)
- In-memory cache with TTL
- No threading (pure async I/O)

TMDB API Documentation: https://developer.themoviedb.org/docs
Free tier limits: 40 requests per 10 seconds
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
