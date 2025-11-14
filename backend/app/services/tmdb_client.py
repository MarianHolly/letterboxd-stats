"""TMDB Client Service for fetching movie metadata.

This module provides a client for The Movie Database (TMDB) API.
It handles:
- Searching for movies by title and year
- Fetching detailed movie information
- Error handling and rate limiting
- Optional in-memory caching
- Async concurrent requests with aiohttp

TMDB API Documentation: https://developer.themoviedb.org/docs
Free tier limits: 40 requests per 10 seconds
"""

import requests
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import time
import asyncio
import aiohttp

logger = logging.getLogger(__name__)


class TMDBClient:
    """Client for TMDB API with caching and rate limiting support."""

    # TMDB API endpoints
    BASE_URL = "https://api.themoviedb.org/3"
    SEARCH_ENDPOINT = f"{BASE_URL}/search/movie"
    MOVIE_ENDPOINT = f"{BASE_URL}/movie"

    # Rate limiting (TMDB free tier: 40 requests per 10 seconds)
    REQUEST_LIMIT = 40
    RATE_LIMIT_WINDOW = 10  # seconds

    # Cache TTL
    CACHE_TTL = 600  # 10 minutes

    def __init__(self, api_key: str):
        """
        Initialize TMDB client.

        Args:
            api_key: TMDB API key from https://www.themoviedb.org/settings/api
        """
        if not api_key:
            raise ValueError("TMDB API key is required")

        self.api_key = api_key
        self.session = requests.Session()

        # Simple in-memory cache: {cache_key: (result, timestamp)}
        self._cache: Dict[str, tuple] = {}

        # Rate limiting tracking
        self._request_times: List[float] = []

        # Async rate limiting: limit to 10 concurrent requests (TMDB allows 40 per 10s)
        # We use 10 to be conservative and avoid rate limiting issues
        self._rate_limiter: Optional[asyncio.Semaphore] = None

        logger.info("TMDB Client initialized successfully")

    def _wait_for_rate_limit(self) -> None:
        """
        Implement rate limiting (40 requests per 10 seconds).

        Removes old timestamps outside the window and waits if needed.
        """
        now = time.time()
        cutoff = now - self.RATE_LIMIT_WINDOW

        # Remove timestamps outside the rate limit window
        self._request_times = [t for t in self._request_times if t > cutoff]

        # If we've hit the limit, wait until the oldest request expires
        if len(self._request_times) >= self.REQUEST_LIMIT:
            wait_time = self._request_times[0] - cutoff + 0.1
            if wait_time > 0:
                logger.debug(f"Rate limit reached. Waiting {wait_time:.2f} seconds")
                time.sleep(wait_time)
                # Clear old timestamps after waiting
                self._request_times = [t for t in self._request_times if t > time.time() - self.RATE_LIMIT_WINDOW]

        # Record this request
        self._request_times.append(time.time())

    def _get_cache_key(self, key_type: str, **params) -> str:
        """Generate cache key from parameters."""
        param_str = "_".join(f"{k}_{v}".lower() for k, v in sorted(params.items()))
        return f"{key_type}_{param_str}"

    def _get_from_cache(self, cache_key: str) -> Optional[Dict]:
        """Get value from cache if not expired."""
        if cache_key in self._cache:
            result, timestamp = self._cache[cache_key]
            if datetime.utcnow() - timestamp < timedelta(seconds=self.CACHE_TTL):
                logger.debug(f"Cache hit: {cache_key}")
                return result
            else:
                # Cache expired, remove it
                del self._cache[cache_key]
        return None

    def _set_cache(self, cache_key: str, value: Dict) -> None:
        """Store value in cache with current timestamp."""
        self._cache[cache_key] = (value, datetime.utcnow())

    def _make_request(self, url: str, params: Dict) -> Optional[Dict]:
        """
        Make request to TMDB API with rate limiting and error handling.

        Args:
            url: Full API endpoint URL
            params: Query parameters (including api_key)

        Returns:
            JSON response as dict, or None if request failed
        """
        self._wait_for_rate_limit()

        try:
            response = self.session.get(url, params=params, timeout=10)

            if response.status_code == 200:
                return response.json()

            elif response.status_code == 404:
                logger.debug(f"Not found: {url}")
                return None

            elif response.status_code == 429:
                # Rate limited by TMDB
                logger.warning("TMDB rate limit exceeded. Waiting before retry...")
                time.sleep(1)
                # Don't retry automatically, let caller decide
                return None

            elif response.status_code == 401:
                logger.error("Invalid TMDB API key")
                return None

            else:
                logger.warning(f"TMDB API error {response.status_code}: {response.text}")
                return None

        except requests.Timeout:
            logger.warning(f"TMDB request timeout for {url}")
            return None

        except requests.RequestException as e:
            logger.error(f"TMDB request failed: {str(e)}")
            return None

    def search_movie(self, title: str, year: Optional[int] = None) -> Optional[Dict]:
        """
        Search for a movie by title and optionally year.

        Args:
            title: Movie title to search for
            year: Optional release year (helps narrow results)

        Returns:
            Dict with movie info (id, title, year, overview) or None if not found.
            Example:
            {
                'id': 550,
                'title': 'Fight Club',
                'release_date': '1999-10-15',
                'overview': '...'
            }
        """
        if not title or not isinstance(title, str):
            logger.warning(f"Invalid title for search: {title}")
            return None

        # Check cache first
        cache_key = self._get_cache_key("search", title=title, year=year)
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached

        try:
            params = {
                "api_key": self.api_key,
                "query": title.strip(),
                "page": 1
            }

            if year and isinstance(year, int):
                params["year"] = year

            response = self._make_request(self.SEARCH_ENDPOINT, params)

            if not response:
                logger.debug(f"Movie not found: {title} ({year})")
                return None

            results = response.get("results", [])

            if not results:
                logger.debug(f"No results for: {title} ({year})")
                return None

            # Get best match (usually first result if released in correct year)
            best_match = self._find_best_match(results, title, year)

            if best_match:
                # Cache the result
                self._set_cache(cache_key, best_match)
                logger.debug(f"Found movie: {best_match.get('title')} ({best_match.get('release_date', '')[:4]})")
                return best_match

            logger.debug(f"No suitable match for: {title} ({year})")
            return None

        except Exception as e:
            logger.error(f"Error searching for movie '{title}': {str(e)}")
            return None

    def _find_best_match(self, results: List[Dict], title: str, year: Optional[int]) -> Optional[Dict]:
        """
        Find the best matching movie from search results.

        Strategy:
        1. If year provided, prefer movies released in that year
        2. Filter out results with low popularity
        3. Use first result if it's a good match

        Args:
            results: List of results from TMDB search
            title: Original title searched
            year: Optional year to match

        Returns:
            Best matching movie result or None
        """
        if not results:
            return None

        # Filter out very low popularity results
        filtered = [r for r in results if r.get("popularity", 0) > 1.0]

        if not filtered:
            # If all filtered out, use original results
            filtered = results

        # If year provided, prefer matches in that year
        if year:
            year_matches = [
                r for r in filtered
                if r.get("release_date", "")[:4] == str(year)
            ]
            if year_matches:
                return year_matches[0]

        # Otherwise use first result
        return filtered[0] if filtered else None

    def get_movie_details(self, tmdb_id: int) -> Optional[Dict]:
        """
        Fetch detailed movie information including genres, cast, and crew.

        Args:
            tmdb_id: TMDB movie ID

        Returns:
            Dict with detailed movie info or None if not found.
            Example return structure:
            {
                'id': 550,
                'title': 'Fight Club',
                'genres': [{'id': 18, 'name': 'Drama'}],
                'runtime': 139,
                'budget': 63000000,
                'revenue': 100853753,
                'popularity': 14.5,
                'vote_average': 8.8,
                'credits': {
                    'cast': [...],
                    'crew': [...]
                }
            }
        """
        if not isinstance(tmdb_id, int) or tmdb_id <= 0:
            logger.warning(f"Invalid TMDB ID: {tmdb_id}")
            return None

        # Check cache first
        cache_key = self._get_cache_key("details", tmdb_id=tmdb_id)
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached

        try:
            url = f"{self.MOVIE_ENDPOINT}/{tmdb_id}"
            params = {
                "api_key": self.api_key,
                "append_to_response": "credits"  # Get cast and crew in same request
            }

            response = self._make_request(url, params)

            if response:
                # Cache the result
                self._set_cache(cache_key, response)
                logger.debug(f"Fetched details for TMDB ID {tmdb_id}")
                return response
            else:
                logger.debug(f"Movie details not found for TMDB ID {tmdb_id}")
                return None

        except Exception as e:
            logger.error(f"Error fetching details for TMDB ID {tmdb_id}: {str(e)}")
            return None

    def extract_enrichment_data(self, movie_details: Dict) -> Dict:
        """
        Extract relevant enrichment data from detailed movie info.

        Transforms TMDB's full response into our simplified structure.

        Args:
            movie_details: Full movie details from get_movie_details()

        Returns:
            Dict with enrichment data:
            {
                'tmdb_id': int,
                'genres': List[str],
                'directors': List[str],
                'cast': List[str],
                'runtime': int,
                'budget': int,
                'revenue': int,
                'popularity': float,
                'vote_average': float
            }
        """
        try:
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
                'original_language': movie_details.get('original_language'), 
                'country': self._extract_country(                              
                    movie_details.get('production_countries', [])
                )
            }

            # Filter out None values and empty lists
            enrichment = {
                k: v for k, v in enrichment.items()
                if v is not None and (not isinstance(v, list) or len(v) > 0)
            }

            return enrichment

        except Exception as e:
            logger.error(f"Error extracting enrichment data: {str(e)}")
            return {}

    def _extract_genres(self, genres: List[Dict]) -> List[str]:
        """Extract genre names from TMDB genre objects."""
        return [g.get('name', '').strip() for g in genres if g.get('name')]

    def _extract_directors(self, crew: List[Dict]) -> List[str]:
        """Extract director names from TMDB crew list."""
        directors = [
            person.get('name', '').strip()
            for person in crew
            if person.get('job') == 'Director' and person.get('name')
        ]
        return directors[:3] if directors else []  # Limit to top 3 directors

    def _extract_cast(self, cast: List[Dict]) -> List[str]:
        """Extract actor names from TMDB cast list."""
        actors = [
            person.get('name', '').strip()
            for person in cast
            if person.get('name')
        ]
        return actors[:5] if actors else []  # Limit to top 5 cast members
    
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

    def enrich_movie(self, title: str, year: Optional[int] = None) -> Optional[Dict]:
        """
        Complete enrichment pipeline: search → fetch details → extract data.

        This is the main entry point for movie enrichment.

        Args:
            title: Movie title
            year: Optional release year

        Returns:
            Enrichment data dict (see extract_enrichment_data) or None if failed.
        """
        # Step 1: Search for movie
        search_result = self.search_movie(title, year)
        if not search_result:
            logger.debug(f"Enrichment failed: movie not found '{title}' ({year})")
            return None

        tmdb_id = search_result.get('id')

        # Step 2: Fetch detailed info
        details = self.get_movie_details(tmdb_id)
        if not details:
            logger.warning(f"Enrichment failed: could not fetch details for TMDB ID {tmdb_id}")
            return None

        # Step 3: Extract enrichment data
        enrichment = self.extract_enrichment_data(details)

        if not enrichment:
            logger.warning(f"Enrichment failed: could not extract data for TMDB ID {tmdb_id}")
            return None

        logger.info(f"Successfully enriched: {title} ({year}) → TMDB ID {tmdb_id}")
        return enrichment

    # ========== ASYNC METHODS (for concurrent enrichment) ==========

    async def _get_rate_limiter(self) -> asyncio.Semaphore:
        """
        Get or create the async rate limiter.

        Creates a new semaphore if we're in a new event loop context.
        """
        try:
            if self._rate_limiter is None:
                self._rate_limiter = asyncio.Semaphore(10)
            return self._rate_limiter
        except RuntimeError:
            # New event loop, create new semaphore
            self._rate_limiter = asyncio.Semaphore(10)
            return self._rate_limiter

    async def search_movie_async(self, title: str, year: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Async search for a movie by title and optionally year.

        Uses aiohttp for concurrent requests with proper rate limiting.

        Args:
            title: Movie title to search for
            year: Optional release year (helps narrow results)

        Returns:
            Dict with search results or None if not found.
        """
        if not title or not isinstance(title, str):
            logger.warning(f"Invalid title for async search: {title}")
            return None

        # Check cache first
        cache_key = self._get_cache_key("search", title=title, year=year)
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached

        try:
            rate_limiter = await self._get_rate_limiter()

            async with rate_limiter:
                async with aiohttp.ClientSession() as session:
                    params = {
                        "api_key": self.api_key,
                        "query": title.strip(),
                        "page": 1
                    }

                    if year and isinstance(year, int):
                        params["year"] = year

                    async with session.get(
                        self.SEARCH_ENDPOINT,
                        params=params,
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as resp:
                        if resp.status == 200:
                            response = await resp.json()
                            # Cache the result
                            self._set_cache(cache_key, response)
                            logger.debug(f"Async search found: {title} ({year})")
                            return response
                        elif resp.status == 404:
                            logger.debug(f"Async search not found: {title} ({year})")
                            return None
                        else:
                            logger.warning(f"TMDB async search error {resp.status} for {title}")
                            return None

        except asyncio.TimeoutError:
            logger.warning(f"Async search timeout for {title}")
            return None
        except Exception as e:
            logger.error(f"Error in async search for '{title}': {str(e)}")
            return None

    async def get_movie_details_async(self, tmdb_id: int) -> Optional[Dict[str, Any]]:
        """
        Async fetch detailed movie information including genres, cast, and crew.

        Uses aiohttp for concurrent requests with proper rate limiting.

        Args:
            tmdb_id: TMDB movie ID

        Returns:
            Dict with detailed movie info or None if not found.
        """
        if not isinstance(tmdb_id, int) or tmdb_id <= 0:
            logger.warning(f"Invalid TMDB ID for async details: {tmdb_id}")
            return None

        # Check cache first
        cache_key = self._get_cache_key("details", tmdb_id=tmdb_id)
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached

        try:
            rate_limiter = await self._get_rate_limiter()

            async with rate_limiter:
                async with aiohttp.ClientSession() as session:
                    url = f"{self.MOVIE_ENDPOINT}/{tmdb_id}"
                    params = {
                        "api_key": self.api_key,
                        "append_to_response": "credits"
                    }

                    async with session.get(
                        url,
                        params=params,
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as resp:
                        if resp.status == 200:
                            response = await resp.json()
                            # Cache the result
                            self._set_cache(cache_key, response)
                            logger.debug(f"Async details fetched for TMDB ID {tmdb_id}")
                            return response
                        elif resp.status == 404:
                            logger.debug(f"Async details not found for TMDB ID {tmdb_id}")
                            return None
                        else:
                            logger.warning(f"TMDB async details error {resp.status} for ID {tmdb_id}")
                            return None

        except asyncio.TimeoutError:
            logger.warning(f"Async details timeout for TMDB ID {tmdb_id}")
            return None
        except Exception as e:
            logger.error(f"Error in async details for TMDB ID {tmdb_id}: {str(e)}")
            return None

    async def enrich_movie_async(self, title: str, year: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Async complete enrichment pipeline: search → fetch details → extract data.

        This is the async entry point for movie enrichment, designed for concurrent use.

        Args:
            title: Movie title
            year: Optional release year

        Returns:
            Enrichment data dict or None if failed.
        """
        # Step 1: Async search for movie
        search_results = await self.search_movie_async(title, year)
        if not search_results:
            logger.debug(f"Async enrichment failed: movie not found '{title}' ({year})")
            return None

        results = search_results.get("results", [])
        if not results:
            logger.debug(f"Async enrichment: no results for '{title}' ({year})")
            return None

        # Get best match
        best_match = self._find_best_match(results, title, year)
        if not best_match:
            logger.debug(f"Async enrichment: no suitable match for '{title}' ({year})")
            return None

        tmdb_id = best_match.get('id')
        if not tmdb_id:
            return None

        # Step 2: Async fetch detailed info
        details = await self.get_movie_details_async(tmdb_id)
        if not details:
            logger.warning(f"Async enrichment failed: could not fetch details for TMDB ID {tmdb_id}")
            return None

        # Step 3: Extract enrichment data (sync operation)
        enrichment = self.extract_enrichment_data(details)

        if not enrichment:
            logger.warning(f"Async enrichment failed: could not extract data for TMDB ID {tmdb_id}")
            return None

        logger.info(f"Successfully enriched (async): {title} ({year}) → TMDB ID {tmdb_id}")
        return enrichment

    # ========== END ASYNC METHODS ==========

    def clear_cache(self) -> None:
        """Clear all cached results."""
        self._cache.clear()
        logger.debug("TMDB cache cleared")

    def get_cache_stats(self) -> Dict:
        """Get cache statistics."""
        return {
            'cached_items': len(self._cache),
            'cache_ttl': self.CACHE_TTL,
            'rate_limit': f"{self.REQUEST_LIMIT} requests per {self.RATE_LIMIT_WINDOW} seconds"
        }
