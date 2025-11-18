"""
Session endpoints for progress and data retrieval.

GET /api/session/{session_id} - Get session status and progress
GET /api/session/{session_id}/movies - Get enriched movies
"""

import logging
import uuid
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.storage import StorageService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/session/{session_id}")
async def get_session_status(session_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get session status and enrichment progress.

    Used by frontend for progress bar polling.
    """
    try:
        session_uuid = uuid.UUID(session_id)

        storage = StorageService(db)
        session = await storage.get_session(session_uuid)

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        return {
            "status": session.status,
            "enriched_count": session.enriched_count,
            "total_movies": session.total_movies,
            "progress_percent": (session.enriched_count / session.total_movies * 100)
            if session.total_movies > 0 else 0
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    except HTTPException:
        raise
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
        session_uuid = uuid.UUID(session_id)

        storage = StorageService(db)
        session = await storage.get_session(session_uuid)

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        movies = await storage.get_session_movies(session_uuid, skip, limit)

        return [
            {
                "title": m.title,
                "year": m.year,
                "rating": m.rating,
                "genres": m.genres,
                "runtime": m.runtime,
                "tmdb_enriched": m.tmdb_enriched,
                "tmdb_id": m.tmdb_id
            }
            for m in movies
        ]

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting movies: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
