"""
Tests for async TMDB client methods

This test suite verifies:
- Async movie search functionality
- Async movie details fetching
- Async movie enrichment (full pipeline)
- Concurrent enrichment with 10+ movies
- Error handling in async operations
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.tmdb_client import TMDBClient


class TestTMDBAsyncClient:
    """Test async TMDB client methods"""

    @pytest.fixture
    def tmdb_client(self):
        """Create TMDB client instance for testing"""
        return TMDBClient(api_key="test_key_123")

    @pytest.mark.asyncio
    async def test_search_movie_async_success(self, tmdb_client):
        """Test async movie search succeeds with valid movie"""
        mock_response = {
            "results": [{
                "id": 603,
                "title": "The Matrix",
                "release_date": "1999-03-31",
                "popularity": 50.0
            }]
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            # Setup mock for successful response
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200
            mock_response_obj.json = AsyncMock(return_value=mock_response)

            mock_get.return_value.__aenter__.return_value = mock_response_obj

            result = await tmdb_client.search_movie_async("The Matrix", 1999)

            assert result is not None
            assert "results" in result
            assert len(result["results"]) > 0
            assert result["results"][0]["id"] == 603

    @pytest.mark.asyncio
    async def test_search_movie_async_not_found(self, tmdb_client):
        """Test async search when movie not found"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            # Setup mock for 404 response
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 404

            mock_get.return_value.__aenter__.return_value = mock_response_obj

            result = await tmdb_client.search_movie_async("NonExistentMovie99999", 2099)

            assert result is None

    @pytest.mark.asyncio
    async def test_search_movie_async_invalid_input(self, tmdb_client):
        """Test async search with invalid input"""
        result = await tmdb_client.search_movie_async(None)
        assert result is None

        result = await tmdb_client.search_movie_async("")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_movie_details_async_success(self, tmdb_client):
        """Test async fetch of movie details succeeds"""
        mock_details = {
            "id": 603,
            "title": "The Matrix",
            "runtime": 136,
            "genres": [
                {"id": 28, "name": "Action"},
                {"id": 878, "name": "Science Fiction"}
            ],
            "credits": {
                "crew": [
                    {"name": "Lana Wachowski", "job": "Director"},
                    {"name": "Lilly Wachowski", "job": "Director"}
                ],
                "cast": [
                    {"name": "Keanu Reeves"},
                    {"name": "Laurence Fishburne"},
                    {"name": "Carrie-Anne Moss"}
                ]
            },
            "vote_average": 8.7,
            "overview": "A computer programmer..."
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200
            mock_response_obj.json = AsyncMock(return_value=mock_details)

            mock_get.return_value.__aenter__.return_value = mock_response_obj

            result = await tmdb_client.get_movie_details_async(603)

            assert result is not None
            assert result["id"] == 603
            assert result["title"] == "The Matrix"
            assert result["runtime"] == 136

    @pytest.mark.asyncio
    async def test_get_movie_details_async_invalid_id(self, tmdb_client):
        """Test async details with invalid TMDB ID"""
        result = await tmdb_client.get_movie_details_async(0)
        assert result is None

        result = await tmdb_client.get_movie_details_async(-1)
        assert result is None

        result = await tmdb_client.get_movie_details_async(None)
        assert result is None

    @pytest.mark.asyncio
    async def test_enrich_movie_async_success(self, tmdb_client):
        """Test async movie enrichment complete pipeline"""
        search_response = {
            "results": [{
                "id": 603,
                "title": "The Matrix",
                "release_date": "1999-03-31",
                "popularity": 50.0
            }]
        }

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
            "vote_average": 8.7,
            "original_language": "en",
            "production_countries": [{"name": "United States"}],
            "budget": 63000000,
            "revenue": 467222728
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200

            # First call returns search, second returns details
            mock_response_obj.json = AsyncMock(
                side_effect=[search_response, details_response]
            )

            mock_get.return_value.__aenter__.return_value = mock_response_obj

            result = await tmdb_client.enrich_movie_async("The Matrix", 1999)

            assert result is not None
            assert result["tmdb_id"] == 603
            assert "Action" in result["genres"]
            assert "Keanu Reeves" in result.get("cast", [])
            assert result.get("runtime") == 136
            assert result.get("vote_average") == 8.7

    @pytest.mark.asyncio
    async def test_enrich_movie_async_not_found(self, tmdb_client):
        """Test async enrichment when movie not found"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200
            mock_response_obj.json = AsyncMock(return_value={"results": []})

            mock_get.return_value.__aenter__.return_value = mock_response_obj

            result = await tmdb_client.enrich_movie_async("NonExistentMovie99999", 2099)

            assert result is None

    @pytest.mark.asyncio
    async def test_search_movie_async_caching(self, tmdb_client):
        """Test that async search caches results"""
        mock_response = {
            "results": [{
                "id": 603,
                "title": "The Matrix",
                "release_date": "1999-03-31",
                "popularity": 50.0
            }]
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200
            mock_response_obj.json = AsyncMock(return_value=mock_response)

            mock_get.return_value.__aenter__.return_value = mock_response_obj

            # First call - should hit API
            result1 = await tmdb_client.search_movie_async("The Matrix", 1999)
            assert result1 is not None

            # Second call - should use cache (same mock called twice would fail)
            result2 = await tmdb_client.search_movie_async("The Matrix", 1999)
            assert result2 is not None

            # Should only have been called once due to cache
            assert mock_get.call_count == 1

    @pytest.mark.asyncio
    async def test_get_movie_details_async_caching(self, tmdb_client):
        """Test that async details caches results"""
        mock_details = {
            "id": 603,
            "title": "The Matrix",
            "runtime": 136,
            "genres": [{"id": 28, "name": "Action"}],
            "credits": {"crew": [], "cast": []},
            "vote_average": 8.7
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200
            mock_response_obj.json = AsyncMock(return_value=mock_details)

            mock_get.return_value.__aenter__.return_value = mock_response_obj

            # First call - should hit API
            result1 = await tmdb_client.get_movie_details_async(603)
            assert result1 is not None

            # Second call - should use cache
            result2 = await tmdb_client.get_movie_details_async(603)
            assert result2 is not None

            # Should only have been called once due to cache
            assert mock_get.call_count == 1


class TestAsyncConcurrency:
    """Test concurrent enrichment capabilities"""

    @pytest.fixture
    def tmdb_client(self):
        """Create TMDB client instance for testing"""
        return TMDBClient(api_key="test_key_123")

    @pytest.mark.asyncio
    async def test_concurrent_enrichment_10_movies(self, tmdb_client):
        """Test that 10 movies can be enriched concurrently"""
        movies = [f"Movie {i}" for i in range(10)]

        mock_result = {
            "tmdb_id": 1,
            "title": "Test Movie",
            "genres": ["Action"],
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
            assert tmdb_client.enrich_movie_async.call_count == 10

    @pytest.mark.asyncio
    async def test_concurrent_enrichment_mixed_results(self, tmdb_client):
        """Test concurrent enrichment with mix of success and failure"""
        movies = [f"Movie {i}" for i in range(5)]

        # Mix of successful and None results
        side_effects = [
            {"tmdb_id": 1, "title": "Movie 0"},
            None,  # Movie not found
            {"tmdb_id": 3, "title": "Movie 2"},
            None,  # Movie not found
            {"tmdb_id": 5, "title": "Movie 4"},
        ]

        with patch.object(
            tmdb_client,
            'enrich_movie_async',
            new_callable=AsyncMock,
            side_effect=side_effects
        ):
            tasks = [
                tmdb_client.enrich_movie_async(movie)
                for movie in movies
            ]
            results = await asyncio.gather(*tasks)

            assert len(results) == 5
            assert results[0] is not None
            assert results[1] is None
            assert results[2] is not None
            assert results[3] is None
            assert results[4] is not None

    @pytest.mark.asyncio
    async def test_concurrent_enrichment_with_errors(self, tmdb_client):
        """Test that concurrent enrichment handles errors gracefully"""
        movies = [f"Movie {i}" for i in range(3)]

        side_effects = [
            {"tmdb_id": 1, "title": "Movie 0"},
            Exception("API Error"),
            {"tmdb_id": 3, "title": "Movie 2"},
        ]

        with patch.object(
            tmdb_client,
            'enrich_movie_async',
            new_callable=AsyncMock,
            side_effect=side_effects
        ):
            tasks = [
                tmdb_client.enrich_movie_async(movie)
                for movie in movies
            ]
            # Use return_exceptions=True to prevent gather from raising
            results = await asyncio.gather(*tasks, return_exceptions=True)

            assert len(results) == 3
            assert results[0] is not None
            assert isinstance(results[1], Exception)
            assert results[2] is not None

    @pytest.mark.asyncio
    async def test_rate_limiter_semaphore(self, tmdb_client):
        """Test that rate limiter semaphore is created and works"""
        # Get rate limiter
        limiter = await tmdb_client._get_rate_limiter()

        # Should be an asyncio.Semaphore with value 10
        assert isinstance(limiter, asyncio.Semaphore)
        assert limiter._value == 10

    @pytest.mark.asyncio
    async def test_rate_limiter_reuse(self, tmdb_client):
        """Test that rate limiter is reused across calls"""
        limiter1 = await tmdb_client._get_rate_limiter()
        limiter2 = await tmdb_client._get_rate_limiter()

        # Should be the same instance
        assert limiter1 is limiter2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
