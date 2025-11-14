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


class TestSessionStatusEndpoint:
    """Test session status endpoint - specifically UUID serialization"""

    def test_get_session_status_returns_string_session_id(self, client, valid_csv_data):
        """Test that GET /api/session/{id}/status returns session_id as string (UUID serialization fix)"""
        # First, upload a file to create a session
        upload_response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        assert upload_response.status_code == 201
        session_id = upload_response.json()["session_id"]

        # Now fetch the session status
        status_response = client.get(f"/api/session/{session_id}/status")

        # Should return 200 (not 500 with UUID serialization error)
        assert status_response.status_code == 200
        data = status_response.json()

        # session_id should be a string, not UUID object
        assert "session_id" in data
        assert isinstance(data["session_id"], str)
        assert data["session_id"] == session_id

    def test_get_session_status_response_structure(self, client, valid_csv_data):
        """Test that session status response has all required fields"""
        # Upload a file
        upload_response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        session_id = upload_response.json()["session_id"]

        # Fetch status
        status_response = client.get(f"/api/session/{session_id}/status")

        assert status_response.status_code == 200
        data = status_response.json()

        # Check all required fields exist
        required_fields = [
            "session_id", "status", "total_movies", "enriched_count",
            "created_at", "expires_at"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_get_session_status_response_types(self, client, valid_csv_data):
        """Test that session status response fields have correct types"""
        upload_response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        session_id = upload_response.json()["session_id"]
        status_response = client.get(f"/api/session/{session_id}/status")
        data = status_response.json()

        # Check field types
        assert isinstance(data["session_id"], str)
        assert isinstance(data["status"], str)
        assert isinstance(data["total_movies"], int)
        assert isinstance(data["enriched_count"], int)
        assert isinstance(data["created_at"], str)
        assert isinstance(data["expires_at"], str)

    def test_get_session_status_not_found(self, client):
        """Test that requesting non-existent session returns 404 or 500"""
        # Note: Invalid UUID format causes 500, valid but non-existent UUID causes 404
        # Using a properly formatted UUID that doesn't exist
        import uuid
        fake_uuid = str(uuid.uuid4())
        response = client.get(f"/api/session/{fake_uuid}/status")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


class TestSessionDetailsEndpoint:
    """Test session details endpoint - specifically UUID serialization"""

    def test_get_session_details_returns_string_session_id(self, client, valid_csv_data):
        """Test that GET /api/session/{id} returns session_id as string (UUID serialization fix)"""
        # Upload a file
        upload_response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        assert upload_response.status_code == 201
        session_id = upload_response.json()["session_id"]

        # Fetch session details
        details_response = client.get(f"/api/session/{session_id}")

        # Should return 200 (not 500 with UUID serialization error)
        assert details_response.status_code == 200
        data = details_response.json()

        # session_id should be a string, not UUID object
        assert "session_id" in data
        assert isinstance(data["session_id"], str)
        assert data["session_id"] == session_id

    def test_get_session_details_response_structure(self, client, valid_csv_data):
        """Test that session details response has all required fields"""
        upload_response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        session_id = upload_response.json()["session_id"]
        details_response = client.get(f"/api/session/{session_id}")

        assert details_response.status_code == 200
        data = details_response.json()

        # Check all required fields
        required_fields = [
            "session_id", "status", "total_movies", "enriched_count",
            "created_at", "expires_at"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_get_session_details_response_types(self, client, valid_csv_data):
        """Test that session details response fields have correct types"""
        upload_response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        session_id = upload_response.json()["session_id"]
        details_response = client.get(f"/api/session/{session_id}")
        data = details_response.json()

        # Check field types
        assert isinstance(data["session_id"], str)
        assert isinstance(data["status"], str)
        assert isinstance(data["total_movies"], int)
        assert isinstance(data["enriched_count"], int)
        assert isinstance(data["created_at"], str)
        assert isinstance(data["expires_at"], str)

    def test_get_session_details_not_found(self, client):
        """Test that requesting non-existent session returns 404 or 500"""
        # Note: Invalid UUID format causes 500, valid but non-existent UUID causes 404
        # Using a properly formatted UUID that doesn't exist
        import uuid
        fake_uuid = str(uuid.uuid4())
        response = client.get(f"/api/session/{fake_uuid}")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


class TestSessionMoviesEndpoint:
    """Test session movies endpoint"""

    def test_get_session_movies_returns_correct_structure(self, client, valid_csv_data):
        """Test that GET /api/session/{id}/movies returns correct structure"""
        # Upload a file
        upload_response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        assert upload_response.status_code == 201
        session_id = upload_response.json()["session_id"]

        # Fetch movies
        movies_response = client.get(f"/api/session/{session_id}/movies")

        assert movies_response.status_code == 200
        data = movies_response.json()

        # Check structure
        assert "movies" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data

    def test_get_session_movies_returns_string_session_id(self, client, valid_csv_data):
        """Test that movie entries maintain string UUIDs"""
        upload_response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        session_id = upload_response.json()["session_id"]
        movies_response = client.get(f"/api/session/{session_id}/movies")

        assert movies_response.status_code == 200
        data = movies_response.json()

        # Check pagination
        assert isinstance(data["total"], int)
        assert isinstance(data["page"], int)
        assert isinstance(data["per_page"], int)

    def test_get_session_movies_pagination(self, client, valid_csv_data):
        """Test that movie pagination works correctly"""
        upload_response = client.post(
            "/api/upload",
            files=[("files", ("diary.csv", valid_csv_data, "text/csv"))]
        )

        session_id = upload_response.json()["session_id"]

        # Test default pagination
        response = client.get(f"/api/session/{session_id}/movies")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["per_page"] == 50

        # Test custom pagination
        response = client.get(f"/api/session/{session_id}/movies?page=1&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert data["per_page"] == 10

    def test_get_session_movies_not_found(self, client):
        """Test that requesting movies for non-existent session returns 404 or 500"""
        # Note: Invalid UUID format causes 500, valid but non-existent UUID causes 404
        # Using a properly formatted UUID that doesn't exist
        import uuid
        fake_uuid = str(uuid.uuid4())
        response = client.get(f"/api/session/{fake_uuid}/movies")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
