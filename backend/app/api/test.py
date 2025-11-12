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
