"""Storage Service - Database operations for sessions and movies."""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.database import SessionModel, MovieModel


class StorageService:
    """Service layer for database operations."""

    def __init__(self, db: Session):
        self.db = db

    def create_session(self, metadata: Optional[dict] = None) -> str:
        """Create a new session record."""
        try:
            session_id = str(uuid.uuid4())
            now = datetime.utcnow()
            new_session = SessionModel(
                id=session_id,
                status="processing",
                total_movies=0,
                enriched_count=0,
                created_at=now,
                last_accessed=now,
                expires_at=now + timedelta(days=30),
                metadata=metadata or {}
            )
            self.db.add(new_session)
            self.db.commit()
            return session_id
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to create session: {str(e)}")

    def get_session(self, session_id: str) -> Optional[SessionModel]:
        """Retrieve a session by ID."""
        try:
            session = self.db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if session:
                now = datetime.utcnow()
                session.last_accessed = now
                session.expires_at = now + timedelta(days=30)
                self.db.commit()
            return session
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to get session: {str(e)}")

    def session_exists(self, session_id: str) -> bool:
        """Check if session exists and hasn't expired."""
        try:
            session = self.db.query(SessionModel).filter(
                SessionModel.id == session_id,
                SessionModel.expires_at > datetime.utcnow()
            ).first()
            return session is not None
        except SQLAlchemyError as e:
            raise Exception(f"Failed to check session existence: {str(e)}")

    def update_session_status(self, session_id: str, status: str) -> None:
        """Update session processing status."""
        valid_statuses = {"processing", "enriching", "completed", "failed"}
        if status not in valid_statuses:
            raise ValueError(f"Invalid status: {status}")
        try:
            session = self.db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if session:
                session.status = status
                self.db.commit()
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to update session status: {str(e)}")

    def update_enriched_count(self, session_id: str, count: int) -> None:
        """Update enriched movie count."""
        try:
            session = self.db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if session:
                session.enriched_count = count
                self.db.commit()
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to update enriched count: {str(e)}")

    def store_movies(self, session_id: str, movies: List[dict]) -> int:
        """Bulk insert movies for a session."""
        if not movies:
            raise ValueError("No movies to store")
        try:
            movie_objects = [MovieModel(
                session_id=session_id,
                title=m.get("title"),
                year=m.get("year"),
                rating=m.get("rating"),
                watched_date=m.get("watched_date"),
                letterboxd_uri=m.get("letterboxd_uri"),
                rewatch=m.get("rewatch", False),
                tags=m.get("tags", []),
                review=m.get("review"),
                created_at=datetime.utcnow()
            ) for m in movies]
            self.db.bulk_save_objects(movie_objects)
            self.db.commit()
            self._update_total_movies_count(session_id)
            return len(movie_objects)
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to store movies: {str(e)}")

    def _update_total_movies_count(self, session_id: str) -> None:
        """Update total_movies count in session."""
        try:
            count = self.db.query(func.count(MovieModel.id)).filter(MovieModel.session_id == session_id).scalar()
            session = self.db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if session:
                session.total_movies = count
                self.db.commit()
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to update total movies count: {str(e)}")

    def get_movies(self, session_id: str, limit: int = 50, offset: int = 0) -> Tuple[List[MovieModel], int]:
        """Retrieve movies for a session with pagination."""
        try:
            total = self.db.query(func.count(MovieModel.id)).filter(MovieModel.session_id == session_id).scalar()
            movies = self.db.query(MovieModel).filter(MovieModel.session_id == session_id).order_by(MovieModel.watched_date.desc()).limit(limit).offset(offset).all()
            return movies, total
        except SQLAlchemyError as e:
            raise Exception(f"Failed to retrieve movies: {str(e)}")

    def get_movie_by_uri(self, session_id: str, letterboxd_uri: str) -> Optional[MovieModel]:
        """Retrieve a single movie by URI."""
        try:
            return self.db.query(MovieModel).filter(MovieModel.session_id == session_id, MovieModel.letterboxd_uri == letterboxd_uri).first()
        except SQLAlchemyError as e:
            raise Exception(f"Failed to retrieve movie: {str(e)}")

    def get_expired_sessions(self) -> List[SessionModel]:
        """Get all expired sessions."""
        try:
            return self.db.query(SessionModel).filter(SessionModel.expires_at <= datetime.utcnow()).all()
        except SQLAlchemyError as e:
            raise Exception(f"Failed to get expired sessions: {str(e)}")

    def delete_session(self, session_id: str) -> None:
        """Delete a session and all its movies."""
        try:
            session = self.db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if session:
                self.db.delete(session)
                self.db.commit()
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to delete session: {str(e)}")

    def get_session_stats(self, session_id: str) -> dict:
        """Get quick statistics for a session."""
        try:
            result = self.db.query(
                func.count(MovieModel.id).label("total_movies"),
                func.avg(MovieModel.rating).label("average_rating"),
                func.min(MovieModel.year).label("min_year"),
                func.max(MovieModel.year).label("max_year"),
                func.count(MovieModel.rating).label("rated_count")
            ).filter(MovieModel.session_id == session_id).first()
            return {
                "total_movies": result.total_movies or 0,
                "average_rating": round(result.average_rating, 2) if result.average_rating else None,
                "min_year": result.min_year,
                "max_year": result.max_year,
                "rated_count": result.rated_count or 0
            }
        except SQLAlchemyError as e:
            raise Exception(f"Failed to get session stats: {str(e)}")
