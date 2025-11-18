"""
Storage service for async database operations.

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
                    title=movie.get("title"),
                    year=movie.get("year"),
                    rating=movie.get("rating"),
                    watched_date=movie.get("watched_date"),
                    letterboxd_uri=movie.get("letterboxd_uri"),
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
