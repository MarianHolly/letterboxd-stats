from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.storage import StorageService
from app.schemas.session import (
    SessionStatusResponse,
    SessionDetailsResponse,
    MoviesListResponse,
    MovieResponse
)

router = APIRouter()

@router.get("/session/{session_id}/status", response_model=SessionStatusResponse)
def get_session_status(session_id: str, db: Session = Depends(get_db)):
    """Check session processing status."""
    storage = StorageService(db)
    session = storage.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    return SessionStatusResponse(
        session_id=session.id,
        status=session.status,
        total_movies=session.total_movies,
        enriched_count=session.enriched_count,
        created_at=session.created_at,
        expires_at=session.expires_at,
        error_message=None
    )

@router.get("/session/{session_id}/movies", response_model=MoviesListResponse)
def get_session_movies(
    session_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve movies for a session."""
    storage = StorageService(db)
    
    if not storage.session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found or expired")

    offset = (page - 1) * per_page
    movies, total = storage.get_movies(session_id, limit=per_page, offset=offset)

    movie_responses = [
        MovieResponse(
            title=m.title,
            year=m.year,
            rating=m.rating,
            watched_date=m.watched_date,
            rewatch=m.rewatch,
            tags=m.tags or [],
            review=m.review,
            letterboxd_uri=m.letterboxd_uri,
            genres=m.genres,
            directors=m.directors,
            cast=m.cast,
            runtime=m.runtime
        )
        for m in movies
    ]

    return MoviesListResponse(
        movies=movie_responses,
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/session/{session_id}", response_model=SessionDetailsResponse)
def get_session_details(session_id: str, db: Session = Depends(get_db)):
    """Get full session details."""
    storage = StorageService(db)
    session = storage.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    return SessionDetailsResponse(
        session_id=session.id,
        status=session.status,
        total_movies=session.total_movies,
        enriched_count=session.enriched_count,
        created_at=session.created_at,
        expires_at=session.expires_at,
        metadata=session.metadata
    )
