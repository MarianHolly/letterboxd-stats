"""
Test script to upload Letterboxd CSV files and monitor enrichment progress.

Usage:
    python test_upload.py --file watched.csv
    python test_upload.py --file watched.csv --file ratings.csv --file diary.csv
"""

import requests
import time
import argparse
from pathlib import Path

API_URL = "http://localhost:8000/api"


def upload_files(file_paths):
    """Upload CSV files to the API."""
    print(f"\nUploading {len(file_paths)} file(s)...")

    files = [("files", open(fp, "rb")) for fp in file_paths]

    try:
        response = requests.post(f"{API_URL}/upload", files=files)
        response.raise_for_status()

        data = response.json()
        session_id = data["session_id"]
        total_movies = data["total_movies"]

        print(f"✓ Upload successful!")
        print(f"  Session ID: {session_id}")
        print(f"  Total movies: {total_movies}")

        return session_id, total_movies

    except requests.exceptions.RequestException as e:
        print(f"✗ Upload failed: {e}")
        return None, None

    finally:
        # Close files
        for _, file_obj in files:
            file_obj.close()


def monitor_progress(session_id, total_movies):
    """Monitor enrichment progress."""
    print(f"\nMonitoring enrichment progress...")
    print("-" * 60)

    last_count = 0
    start_time = time.time()

    while True:
        try:
            response = requests.get(f"{API_URL}/session/{session_id}")
            response.raise_for_status()

            data = response.json()
            status = data["status"]
            enriched_count = data["enriched_count"]
            progress = data["progress_percent"]

            # Show progress bar
            bar_length = 40
            filled = int(bar_length * enriched_count / total_movies)
            bar = "█" * filled + "░" * (bar_length - filled)

            elapsed = time.time() - start_time
            rate = enriched_count / elapsed if elapsed > 0 else 0

            print(
                f"\r[{bar}] {enriched_count}/{total_movies} ({progress:.1f}%) "
                f"| {rate:.1f} movies/sec | Status: {status}",
                end="",
                flush=True
            )

            # Check if complete
            if status == "completed":
                print("\n✓ Enrichment complete!")
                break

            if status == "failed":
                print("\n✗ Enrichment failed!")
                break

            time.sleep(2)  # Poll every 2 seconds

        except requests.exceptions.RequestException as e:
            print(f"\n✗ Error monitoring progress: {e}")
            break


def get_movies(session_id, limit=10):
    """Fetch enriched movies from session."""
    print(f"\nFetching enriched movies (limit: {limit})...")
    print("-" * 60)

    try:
        response = requests.get(
            f"{API_URL}/session/{session_id}/movies",
            params={"limit": limit}
        )
        response.raise_for_status()

        movies = response.json()

        if not movies:
            print("No movies found")
            return

        print(f"\nFound {len(movies)} movies:\n")

        for i, movie in enumerate(movies, 1):
            print(f"{i}. {movie['title']} ({movie['year']})")
            if movie.get("genres"):
                print(f"   Genres: {', '.join(movie['genres'])}")
            if movie.get("runtime"):
                print(f"   Runtime: {movie['runtime']} min")
            if movie.get("tmdb_id"):
                print(f"   TMDB ID: {movie['tmdb_id']}")
            print()

    except requests.exceptions.RequestException as e:
        print(f"✗ Error fetching movies: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Upload Letterboxd CSV files and monitor enrichment"
    )
    parser.add_argument(
        "--file",
        "-f",
        action="append",
        dest="files",
        required=True,
        help="CSV file to upload (can use multiple times)"
    )
    parser.add_argument(
        "--no-monitor",
        action="store_true",
        help="Skip progress monitoring"
    )
    parser.add_argument(
        "--no-fetch",
        action="store_true",
        help="Skip fetching movies after enrichment"
    )

    args = parser.parse_args()

    # Validate files exist
    file_paths = []
    for f in args.files:
        path = Path(f)
        if not path.exists():
            print(f"✗ File not found: {f}")
            return
        file_paths.append(str(path))

    # Upload files
    session_id, total_movies = upload_files(file_paths)
    if not session_id:
        return

    # Monitor progress
    if not args.no_monitor:
        monitor_progress(session_id, total_movies)

    # Fetch enriched movies
    if not args.no_fetch:
        time.sleep(1)  # Wait a moment before fetching
        get_movies(session_id, limit=20)

    print("\nDone!")


if __name__ == "__main__":
    main()
