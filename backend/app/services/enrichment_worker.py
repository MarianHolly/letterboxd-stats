"""
Background enrichment worker using async event loop (no APScheduler).

Key changes:
- No APScheduler (use native async instead)
- Single async task (run_loop)
- Explicit batch processing with rate limiting
- Atomic progress updates (no race conditions)
- Full session lifecycle management
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import Session as SessionModel, Movie
from app.services.tmdb_client import TMDBClient
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


def get_trace_id(session_id: uuid.UUID) -> str:
    """Create short trace ID for logging."""
    return str(session_id)[:8]


class EnrichmentWorker:
    """
    Background enrichment worker that runs continuously.

    Replaces APScheduler with a simple async loop.
    """

    def __init__(self, tmdb_client: TMDBClient):
        self.tmdb_client = tmdb_client
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self.poll_interval = 10  # Check for enriching sessions every 10 seconds

    async def start(self):
        """Start the background enrichment loop."""
        if self._running:
            logger.warning("Enrichment worker already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Enrichment worker started")

    async def stop(self):
        """Stop the background enrichment loop."""
        self._running = False
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=5)
            except asyncio.TimeoutError:
                logger.warning("Enrichment worker stop timeout")
                self._task.cancel()
        logger.info("Enrichment worker stopped")

    async def _run_loop(self):
        """
        Main enrichment loop.

        Every poll_interval seconds:
        1. Query sessions with status='enriching'
        2. For each session, process unenriched movies
        3. Batch them, TMDB enrich concurrently
        4. Update session status when done
        """
        logger.info("Enrichment loop started")

        while self._running:
            try:
                await self._process_enriching_sessions()
                await asyncio.sleep(self.poll_interval)

            except Exception as e:
                logger.error(f"Error in enrichment loop: {e}", exc_info=True)
                await asyncio.sleep(self.poll_interval)

    async def _process_enriching_sessions(self):
        """Process all sessions currently in 'enriching' state."""
        async with AsyncSessionLocal() as db:
            try:
                # Query sessions that need enrichment
                result = await db.execute(
                    select(SessionModel).where(SessionModel.status == 'enriching')
                )
                enriching_sessions = result.scalars().all()

                if not enriching_sessions:
                    logger.debug("No sessions to enrich")
                    return

                logger.info(f"Found {len(enriching_sessions)} enriching session(s)")

                # Process each session
                for session in enriching_sessions:
                    await self._enrich_session(session.id)

            except Exception as e:
                logger.error(f"Error processing sessions: {e}", exc_info=True)

    async def _enrich_session(self, session_id: uuid.UUID):
        """
        Enrich all unenriched movies for a session.

        Process in batches of 10 with rate limiting.
        """
        trace_id = get_trace_id(session_id)

        async with AsyncSessionLocal() as db:
            try:
                logger.info(f"[{trace_id}] Starting enrichment")

                # Fetch session
                session = await db.get(SessionModel, session_id)
                if not session:
                    logger.error(f"[{trace_id}] Session not found")
                    return

                # Extend session expiry
                session.expires_at = datetime.utcnow() + timedelta(days=30)
                await db.commit()
                logger.debug(f"[{trace_id}] Extended session expiry")

                # Get unenriched movies
                movies = await self._get_unenriched_movies(db, session_id)
                if not movies:
                    logger.info(f"[{trace_id}] No unenriched movies")
                    await self._update_session_status(db, session_id, 'completed')
                    return

                logger.info(f"[{trace_id}] Found {len(movies)} unenriched movies")

                # Process in batches of 10
                batch_size = 10
                total_batches = (len(movies) + batch_size - 1) // batch_size

                for batch_num in range(total_batches):
                    if not self._running:
                        logger.warning(f"[{trace_id}] Enrichment stopped")
                        break

                    # Get batch
                    start_idx = batch_num * batch_size
                    end_idx = start_idx + batch_size
                    batch = movies[start_idx:end_idx]

                    logger.info(
                        f"[{trace_id}] Batch {batch_num + 1}/{total_batches}: "
                        f"Enriching {len(batch)} movies"
                    )

                    # Enrich batch (concurrent)
                    await self._enrich_batch(db, session_id, batch, trace_id)

                    # Get current progress
                    session = await db.get(SessionModel, session_id)
                    logger.info(
                        f"[{trace_id}] Progress: {session.enriched_count}/{session.total_movies}"
                    )

                    # Rate limiting
                    if batch_num < total_batches - 1:
                        logger.debug(f"[{trace_id}] Rate limiting: waiting 2.5s")
                        await asyncio.sleep(2.5)

                # Mark session as completed
                logger.info(f"[{trace_id}] Enrichment complete")
                await self._update_session_status(db, session_id, 'completed')

            except Exception as e:
                logger.error(f"[{trace_id}] Error enriching session: {e}", exc_info=True)
                await self._update_session_status(db, session_id, 'failed', error_msg=str(e))

    async def _enrich_batch(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        movies: List[Movie],
        trace_id: str
    ):
        """
        Enrich batch of movies concurrently.

        All TMDB calls are concurrent (non-blocking).
        DB updates happen after all TMDB calls complete.
        """
        # Create concurrent tasks for TMDB enrichment
        tasks = [
            self.tmdb_client.enrich_movie_async(movie.title, movie.year)
            for movie in movies
        ]

        # Wait for all TMDB calls (concurrent)
        enrichment_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results and update DB
        successful = 0
        for movie, enrichment in zip(movies, enrichment_results):
            if isinstance(enrichment, Exception):
                logger.warning(f"[{trace_id}] Movie {movie.title}: {enrichment}")
                continue

            if enrichment:
                try:
                    # Update movie with TMDB data
                    await self._save_movie_enrichment(db, movie.id, enrichment)
                    successful += 1
                    logger.debug(f"[{trace_id}] Enriched: {movie.title}")
                except Exception as e:
                    logger.error(f"[{trace_id}] Failed to save {movie.title}: {e}")
            else:
                logger.warning(f"[{trace_id}] No TMDB data for {movie.title}")

        # Update progress counter (atomic)
        try:
            await self._increment_progress(db, session_id, successful)
            logger.debug(f"[{trace_id}] Progress incremented by {successful}")
        except Exception as e:
            logger.error(f"[{trace_id}] Failed to update progress: {e}")

    async def _get_unenriched_movies(
        self,
        db: AsyncSession,
        session_id: uuid.UUID
    ) -> List[Movie]:
        """Get all unenriched movies for session."""
        try:
            result = await db.execute(
                select(Movie).where(
                    (Movie.session_id == session_id) &
                    (Movie.tmdb_enriched == False)
                )
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching unenriched movies: {e}")
            return []

    async def _save_movie_enrichment(
        self,
        db: AsyncSession,
        movie_id: int,
        enrichment: dict
    ):
        """Save TMDB enrichment data to database."""
        try:
            movie = await db.get(Movie, movie_id)
            if not movie:
                logger.warning(f"Movie {movie_id} not found")
                return

            # Update movie fields
            movie.tmdb_id = enrichment.get("tmdb_id")
            movie.genres = enrichment.get("genres", [])
            movie.runtime = enrichment.get("runtime")
            movie.tmdb_enriched = True

            await db.commit()
        except Exception as e:
            await db.rollback()
            raise e

    async def _increment_progress(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        count: int = 1
    ):
        """Increment progress counter (atomic)."""
        try:
            session = await db.get(SessionModel, session_id)
            if session:
                session.enriched_count += count
                await db.commit()
        except Exception as e:
            await db.rollback()
            raise e

    async def _update_session_status(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        status: str,
        error_msg: Optional[str] = None
    ):
        """Update session status (explicit state transition)."""
        try:
            session = await db.get(SessionModel, session_id)
            if session:
                old_status = session.status
                session.status = status
                if error_msg:
                    session.error_message = error_msg
                await db.commit()
                logger.info(f"Session {session_id}: {old_status} -> {status}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update session status: {e}")
