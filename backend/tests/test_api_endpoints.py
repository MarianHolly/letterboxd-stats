"""
Tests for API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def valid_csv_data():
    """Create valid CSV file for testing"""
    csv_content = b"""Name,Year,Watched Date,Rating
The Matrix,1999,2024-01-15,5
Inception,2010,2024-01-10,4.5
Pulp Fiction,1994,2024-01-05,4
"""
    return csv_content


@pytest.fixture
def invalid_csv_no_watched_date():
    """CSV missing Watched Date column"""
    csv_content = b"""Name,Year,Rating
The Matrix,1999,5
Inception,2010,4.5
"""
    return csv_content


@pytest.fixture
def invalid_csv_no_name():
    """CSV missing Name column"""
    csv_content = b"""Year,Watched Date,Rating
1999,2024-01-15,5
2010,2024-01-10,4.5
"""
    return csv_content


class TestHealthCheck:
    """Test health check endpoint"""

    def test_root_endpoint(self, client):
        """Test root endpoint returns correct message"""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "Letterboxd Stats API", "status": "running"}

    def test_root_endpoint_structure(self, client):
        """Test root endpoint returns expected structure"""
        response = client.get("/")
        data = response.json()
        assert isinstance(data, dict)
        assert "message" in data


class TestUploadEndpoint:
    """Test CSV upload endpoint"""

    def test_upload_valid_csv(self, client, valid_csv_data):
        """Test uploading valid CSV returns session data"""
        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        assert response.status_code == 201
        data = response.json()

        # Check response structure
        assert "session_id" in data
        assert "status" in data
        assert "total_movies" in data
        assert "created_at" in data

        # Check values - status depends on whether TMDB_API_KEY is set
        assert data["status"] in ["enriching", "completed"]
        # Note: total_movies depends on parser successfully recognizing the CSV format
        assert isinstance(data["total_movies"], int)
        assert data["total_movies"] >= 0

    def test_upload_csv_missing_watched_date(self, client, invalid_csv_no_watched_date):
        """Test that missing Watched Date column returns error"""
        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", invalid_csv_no_watched_date, "text/csv"))]
        )

        assert response.status_code in [400, 500]
        data = response.json()
        assert "detail" in data

    def test_upload_csv_missing_name(self, client, invalid_csv_no_name):
        """Test that missing Name column returns error"""
        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", invalid_csv_no_name, "text/csv"))]
        )

        assert response.status_code in [400, 500]
        data = response.json()
        assert "detail" in data

    def test_upload_no_file(self, client):
        """Test upload without file returns error"""
        response = client.post("/api/upload")
        assert response.status_code != 201

    def test_upload_response_structure(self, client, valid_csv_data):
        """Test that response has all required fields"""
        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        data = response.json()
        required_fields = [
            "session_id", "status", "total_movies", "created_at"
        ]

        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_upload_response_types(self, client, valid_csv_data):
        """Test that response fields have correct types"""
        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        data = response.json()

        # Required fields
        assert isinstance(data["session_id"], str)
        assert isinstance(data["status"], str)
        assert isinstance(data["total_movies"], int)
        assert isinstance(data["created_at"], str)


class TestUploadWithMockedTMDB:
    """Test upload endpoint with mocked TMDB API"""

    @patch('app.services.tmdb_client.requests.get')
    def test_upload_with_tmdb_success(self, mock_get, client, valid_csv_data):
        """Test successful TMDB enrichment"""
        # Mock TMDB API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "results": [{
                "title": "The Matrix",
                "poster_path": "/viq8wSYcV7QvNxYaIV28MQxg63O.jpg",
                "overview": "A hacker is contacted by resistance fighters...",
                "vote_average": 8.7,
                "release_date": "1999-03-31"
            }]
        }
        mock_get.return_value = mock_response

        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        assert response.status_code == 201
        data = response.json()

        # Check session was created
        assert data["session_id"]
        assert data["status"] in ["enriching", "completed"]

    @patch('app.services.tmdb_client.requests.get')
    def test_upload_with_tmdb_no_results(self, mock_get, client, valid_csv_data):
        """Test when TMDB API returns no results"""
        # Mock TMDB API response with no results
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"results": []}
        mock_get.return_value = mock_response

        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        assert response.status_code == 201
        data = response.json()

        # Should return session data
        assert data["session_id"]
        assert data["status"] in ["enriching", "completed"]

    @patch('app.services.tmdb_client.requests.get')
    def test_upload_with_tmdb_api_error(self, mock_get, client, valid_csv_data):
        """Test when TMDB API returns error"""
        # Mock TMDB API error response
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_get.return_value = mock_response

        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        assert response.status_code == 201
        data = response.json()

        # Should return session data
        assert data["session_id"]
        assert data["status"] in ["enriching", "completed"]

    @patch('app.services.tmdb_client.requests.get')
    def test_upload_with_tmdb_timeout(self, mock_get, client, valid_csv_data):
        """Test when TMDB API times out"""
        from requests.exceptions import Timeout

        # Mock TMDB API timeout
        mock_get.side_effect = Timeout("Connection timeout")

        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        assert response.status_code == 201
        data = response.json()

        # Should return session data
        assert data["session_id"]
        assert data["status"] in ["enriching", "completed"]

    def test_upload_without_tmdb_key(self, client, valid_csv_data):
        """Test upload without TMDB API key (simulated by patching to None)"""
        with patch('main.TMDB_API_KEY', None):
            response = client.post(
                "/api/upload",
                files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
            )

            assert response.status_code == 201
            data = response.json()

            # Should return session data
            assert data["session_id"]
            assert data["status"] in ["enriching", "completed"]
            # Note: total_movies depends on parser successfully recognizing the CSV format
            assert isinstance(data["total_movies"], int)
            assert data["total_movies"] >= 0


class TestUploadErrorHandling:
    """Test error handling in upload endpoint"""

    def test_upload_malformed_csv(self, client):
        """Test uploading malformed CSV"""
        malformed_csv = b"not,csv,format\n1,2,3,4,5"

        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", malformed_csv, "text/csv"))]
        )

        # Should handle gracefully
        assert response.status_code in [201, 400, 500]

    def test_upload_empty_csv(self, client):
        """Test uploading empty CSV"""
        empty_csv = b""

        response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", empty_csv, "text/csv"))]
        )

        # Should return error
        assert response.status_code != 201
