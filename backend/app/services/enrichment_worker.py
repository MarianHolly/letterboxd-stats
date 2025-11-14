"""Enrichment Worker - Background task for TMDB enrichment.

This module provides a background worker that enriches movies with TMDB data.
It runs on a scheduled interval and processes all sessions with status='enriching'.

Architecture:
- Uses APScheduler for background task scheduling
- Polls for sessions that need enrichment
- For each session, enriches all unenriched movies
- Updates progress and marks sessions as complete
- Handles errors gracefully (logs and continues)

Rate Limiting:
- TMDB API: 40 requests per 10 seconds (handled by TMDBClient)
- Enrichment: ~100-150 movies per minute (depends on TMDB availability)
"""

import logging
from typing import Optional
from datetime import datetime
import asyncio
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.services.tmdb_client import TMDBClient
from app.services.storage import StorageService

logger = logging.getLogger(__name__)


class EnrichmentWorker:
    """Background worker for TMDB enrichment.

    Responsibilities:
    - Run on a scheduled interval (default: every 10 seconds)
    - Find sessions with status='enriching'
    - For each session, enrich all unenriched movies
    - Update progress counter as movies are enriched
    - Mark sessions as 'completed' when finished
    - Handle errors and log issues

    Usage:
        # In main.py startup
        tmdb_client = TMDBClient(api_key)
        enrichment_worker = EnrichmentWorker(tmdb_client, storage_service)
        enrichment_worker.start_scheduler()

        # In main.py shutdown
        enrichment_worker.stop_scheduler()
    """

    def __init__(self, tmdb_client: TMDBClient, db_session_factory):
        """
        Initialize the enrichment worker.

        Args:
            tmdb_client: TMDBClient instance for fetching TMDB data
            db_session_factory: SQLAlchemy SessionLocal factory (not a StorageService instance)
                               This allows creating fresh sessions for each polling cycle
        """
        self.tmdb_client = tmdb_client
        self.db_session_factory = db_session_factory
        self.scheduler = BackgroundScheduler()

        logger.info("EnrichmentWorker initialized")

    def start_scheduler(self) -> None:
        """Start the background enrichment scheduler.

        Starts a background task that runs every 10 seconds to enrich movies.
        The task will:
        1. Find all sessions with status='enriching'
        2. For each session, enrich all unenriched movies
        3. Update progress counters
        4. Mark sessions as 'completed' when done

        Call this in app startup event.
        """
        if self.scheduler.running:
            logger.warning("Scheduler is already running")
            return

        try:
            # Schedule the enrichment job to run every 10 seconds
            self.scheduler.add_job(
                self.enrich_sessions,
                trigger=IntervalTrigger(seconds=10),
                id="enrichment_job",
                name="TMDB Enrichment Job",
                replace_existing=True,
                max_instances=1,  # Prevent concurrent executions
                coalesce=True,  # Skip missed runs if job takes longer than interval
                misfire_grace_time=60  # Allow up to 60 seconds before considering it a misfire
            )

            self.scheduler.start()
            logger.info("EnrichmentWorker scheduler started (interval: 10 seconds)")

        except Exception as e:
            logger.error(f"Failed to start enrichment scheduler: {str(e)}")
            raise

    def stop_scheduler(self) -> None:
        """Stop the background enrichment scheduler.

        Stops the scheduled enrichment task gracefully.
        Any in-progress enrichments will complete, no new ones will start.

        Call this in app shutdown event.
        """
        if not self.scheduler.running:
            logger.warning("Scheduler is not running")
            return

        try:
            self.scheduler.shutdown(wait=True)
            logger.info("EnrichmentWorker scheduler stopped")

        except Exception as e:
            logger.error(f"Error stopping enrichment scheduler: {str(e)}")
            raise

    def enrich_sessions(self) -> None:
        """Main job: Find and enrich all sessions waiting for enrichment.

        This method is called on every scheduler interval (every 10 seconds).
        It finds all sessions with status='enriching' and processes them using async.

        Flow:
        1. Get all sessions with status='enriching'
        2. For each session:
           a. Create event loop for async operations
           b. Run async enrichment (10 concurrent movies per batch)
           c. Close event loop
        3. Log summary of what was processed

        Performance:
        - Sequential (old): ~17.5s for 50 movies (exceeds 10s interval)
        - Async (new): ~2-3s for 50 movies (fits within 10s interval)

        Error Handling:
        - Catches exceptions per session (one failure doesn't block others)
        - Logs errors for debugging
        - Continues processing remaining sessions
        """
        # Create a fresh database session for this polling cycle
        # This ensures we see the latest database state from other requests
        db = self.db_session_factory()

        try:
            from app.services.storage import StorageService
            storage = StorageService(db)

            # Find sessions that need enrichment
            sessions = storage.get_enriching_sessions()

            if not sessions:
                # No work to do, that's fine
                logger.debug("No sessions to enrich")
                return

            logger.info(f"Found {len(sessions)} session(s) to enrich")

            # Process each session with async enrichment
            for session in sessions:
                try:
                    # Create a fresh event loop for this session
                    logger.info(f"Session {session.id}: Starting async enrichment (creating event loop)")
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        # Run async enrichment for this session
                        # Note: Don't pass storage from main thread - async tasks will create their own
                        loop.run_until_complete(
                            self.enrich_session_async(session.id, None)
                        )
                    finally:
                        loop.close()
                        logger.info(f"Session {session.id}: Event loop closed")

                except Exception as e:
                    # Log error but continue with next session
                    logger.error(
                        f"Error enriching session {session.id}: {str(e)}",
                        exc_info=True
                    )

        except Exception as e:
            # Unexpected error in main job
            logger.error(f"Unexpected error in enrich_sessions: {str(e)}", exc_info=True)
        finally:
            # Always close the database session
            db.close()

    def enrich_session(self, session_id: str, storage: "StorageService") -> None:
        """Enrich all unenriched movies in a session.

        For a single session:
        1. Get all unenriched movies
        2. For each movie:
           a. Search TMDB for the movie
           b. Fetch detailed information
           c. Extract enrichment data
           d. Update database with TMDB fields
           e. Increment progress counter
           f. Log success or failure
        3. When complete, mark session as 'completed'

        Args:
            session_id: UUID of the session to enrich
            storage: StorageService instance to use for this session

        Error Handling:
        - Movie enrichment failures don't fail the whole session
        - Failed movies are logged but skipped (continue with next)
        - If no movies to enrich, session is marked complete anyway
        """
        try:
            # Get all movies that need enrichment
            unenriched_movies = storage.get_unenriched_movies(session_id)

            if not unenriched_movies:
                logger.info(f"Session {session_id}: No unenriched movies, marking complete")
                storage.update_session_status(session_id, "completed")
                return

            logger.info(
                f"Session {session_id}: Enriching {len(unenriched_movies)} movies"
            )

            # Enrich each movie
            for index, movie in enumerate(unenriched_movies, 1):
                try:
                    # Step 1: Get TMDB enrichment data
                    enrichment_data = self.tmdb_client.enrich_movie(
                        title=movie.title,
                        year=movie.year
                    )

                    if enrichment_data:
                        # Step 2: Save to database
                        storage.update_movie_enrichment(
                            movie_id=movie.id,
                            tmdb_data=enrichment_data
                        )

                        logger.debug(
                            f"Enriched: {movie.title} "
                            f"({index}/{len(unenriched_movies)}) "
                            f"TMDB ID {enrichment_data.get('tmdb_id')}"
                        )

                    else:
                        # Movie not found in TMDB
                        logger.warning(
                            f"Not found in TMDB: {movie.title} ({movie.year})"
                        )

                except Exception as e:
                    # Error enriching this specific movie
                    logger.error(
                        f"Error enriching movie {movie.title}: {str(e)}"
                    )
                    # Continue to next movie

                finally:
                    # Always update progress counter, even on failure
                    # This way we don't get stuck if there's a transient error
                    try:
                        storage.increment_enriched_count(session_id)

                    except Exception as e:
                        logger.error(f"Error updating progress: {str(e)}")

            # Mark session as complete
            storage.update_session_status(session_id, "completed")
            logger.info(f"Session {session_id}: Enrichment complete")

        except Exception as e:
            logger.error(
                f"Unexpected error enriching session {session_id}: {str(e)}",
                exc_info=True
            )

    # ========== ASYNC METHODS (for concurrent enrichment) ==========

    async def enrich_session_async(self, session_id: str, storage: Optional["StorageService"]) -> None:
        """Async enrich all unenriched movies in a session (10 concurrent).

        This method processes movies in parallel batches of 10, dramatically improving
        enrichment speed from ~17.5s (sequential) to ~2-3s for 50 movies.

        Args:
            session_id: UUID of the session to enrich
            storage: Unused (for compatibility), each async task creates its own session

        Process:
        1. Get all unenriched movies for the session (from thread pool)
        2. Process in batches of 10 using asyncio.gather()
        3. For each batch, enrich movies concurrently (async TMDB + thread pool DB)
        4. Update progress after each batch (in thread pool)
        5. Mark session complete when done (in thread pool)

        Error Handling:
        - Individual movie errors are caught and logged but don't stop other movies
        - return_exceptions=True ensures all movies are attempted even if some fail

        Thread Management:
        - Uses asyncio.to_thread() to fetch movies (avoids blocking event loop)
        - Each async task creates its own database session in thread pool
        """
        logger.info(f"[ASYNC] Session {session_id}: Entering async enrichment method")
        try:
            # Get all movies that need enrichment (in thread pool)
            unenriched_movies = await asyncio.to_thread(
                self._get_unenriched_movies,
                session_id
            )
            logger.info(f"[ASYNC] Session {session_id}: Found {len(unenriched_movies)} unenriched movies")

            if not unenriched_movies:
                logger.info(f"Session {session_id}: No unenriched movies, marking complete")
                await asyncio.to_thread(
                    self._update_session_status,
                    session_id,
                    "completed"
                )
                return

            logger.info(
                f"Session {session_id}: Enriching {len(unenriched_movies)} movies "
                f"(async, 10 concurrent)"
            )

            # Process in batches of 10
            batch_size = 10
            for batch_start in range(0, len(unenriched_movies), batch_size):
                batch = unenriched_movies[batch_start:batch_start + batch_size]

                logger.debug(
                    f"Session {session_id}: Processing batch "
                    f"{batch_start//batch_size + 1}/{(len(unenriched_movies)-1)//batch_size + 1} "
                    f"({len(batch)} movies)"
                )

                # Create async tasks for all movies in batch
                tasks = [
                    self._enrich_movie_async(movie, session_id)
                    for movie in batch
                ]

                # Wait for all tasks in batch to complete
                # return_exceptions=True ensures we continue even if some fail
                await asyncio.gather(*tasks, return_exceptions=True)

            # Mark session as complete (in thread pool)
            await asyncio.to_thread(
                self._update_session_status,
                session_id,
                "completed"
            )
            logger.info(f"Session {session_id}: Async enrichment complete")

        except Exception as e:
            logger.error(
                f"Unexpected error in async enrichment for {session_id}: {str(e)}",
                exc_info=True
            )

    async def _enrich_movie_async(
        self,
        movie,
        session_id: str
    ) -> None:
        """Async enrich a single movie (called concurrently in batches).

        Args:
            movie: Movie object with title and year
            session_id: Session ID for logging progress

        This method:
        1. Calls the async TMDB client to enrich the movie (async, concurrent)
        2. Updates database with enrichment data (sync, in thread pool to avoid blocking event loop)
        3. Always updates progress counter (sync, in thread pool)
        4. Catches exceptions to prevent one failure from affecting others

        Note: Database calls are wrapped in asyncio.to_thread() with fresh session management
        to avoid SQLAlchemy thread-local session conflicts. Each thread pool task creates
        its own database session, ensuring proper transaction isolation.
        """
        enrichment_data = None

        try:
            # Step 1: Get TMDB enrichment data (async, non-blocking, concurrent)
            enrichment_data = await self.tmdb_client.enrich_movie_async(
                title=movie.title,
                year=movie.year
            )

            if enrichment_data:
                # Step 2: Save enrichment data in thread pool (atomic DB operation)
                await asyncio.to_thread(
                    self._save_movie_enrichment,
                    movie.id,
                    enrichment_data
                )
                logger.debug(
                    f"Enriched async: {movie.title} "
                    f"(TMDB ID {enrichment_data.get('tmdb_id')})"
                )
            else:
                logger.warning(f"Not found in TMDB: {movie.title} ({movie.year})")

        except Exception as e:
            logger.error(f"Error enriching movie {movie.title}: {str(e)}")

        finally:
            # Step 3: Always update progress counter in thread pool (atomic DB operation)
            try:
                await asyncio.to_thread(
                    self._increment_progress,
                    session_id
                )
            except Exception as e:
                logger.error(f"Error updating progress: {str(e)}")

    def _save_movie_enrichment(self, movie_id: str, enrichment_data: dict) -> None:
        """Save movie enrichment data (runs in thread pool).

        This method creates its own database session to avoid conflicts
        with the main thread's session management.
        """
        from app.db.session import SessionLocal
        from app.services.storage import StorageService

        db = SessionLocal()
        try:
            storage = StorageService(db)
            storage.update_movie_enrichment(
                movie_id=movie_id,
                tmdb_data=enrichment_data
            )
        finally:
            db.close()

    def _increment_progress(self, session_id: str) -> None:
        """Increment progress counter (runs in thread pool).

        This method creates its own database session to avoid conflicts
        with the main thread's session management.
        """
        from app.db.session import SessionLocal
        from app.services.storage import StorageService

        db = SessionLocal()
        try:
            storage = StorageService(db)
            storage.increment_enriched_count(session_id)
        finally:
            db.close()

    def _get_unenriched_movies(self, session_id: str):
        """Get unenriched movies for a session (runs in thread pool)."""
        from app.db.session import SessionLocal
        from app.services.storage import StorageService

        db = SessionLocal()
        try:
            storage = StorageService(db)
            return storage.get_unenriched_movies(session_id)
        finally:
            db.close()

    def _update_session_status(self, session_id: str, status: str) -> None:
        """Update session status (runs in thread pool)."""
        from app.db.session import SessionLocal
        from app.services.storage import StorageService

        db = SessionLocal()
        try:
            storage = StorageService(db)
            storage.update_session_status(session_id, status)
        finally:
            db.close()

    # ========== END ASYNC METHODS ==========

    def get_status(self) -> dict:
        """Get status of the enrichment worker.

        Returns information about the current state of the enrichment worker.

        Returns:
            Dict with worker status:
            {
                'running': bool - Whether scheduler is running
                'last_run': datetime or None - Last execution time
                'next_run': datetime or None - Next scheduled execution
                'interval': int - Interval between runs (seconds)
            }
        """
        try:
            job = self.scheduler.get_job("enrichment_job")

            if not job:
                return {
                    'running': self.scheduler.running,
                    'last_run': None,
                    'next_run': None,
                    'interval': 10,
                    'message': 'Enrichment job not found in scheduler'
                }

            return {
                'running': self.scheduler.running,
                'last_run': getattr(job, 'last_execution_time', None),
                'next_run': job.next_run_time if hasattr(job, 'next_run_time') else None,
                'interval': 10  # seconds
            }

        except Exception as e:
            logger.error(f"Error getting worker status: {str(e)}")
            return {
                'running': self.scheduler.running if self.scheduler else False,
                'last_run': None,
                'next_run': None,
                'interval': 10,
                'error': str(e)
            }

    def pause_enrichment(self) -> None:
        """Pause enrichment without stopping the scheduler.

        Removes the enrichment job while keeping scheduler running.
        Call resume_enrichment() to restart.

        Useful for:
        - Temporary pause while debugging
        - Reducing load during peak hours
        - Testing
        """
        try:
            self.scheduler.remove_job("enrichment_job")
            logger.info("Enrichment paused (scheduler still running)")

        except Exception as e:
            logger.error(f"Error pausing enrichment: {str(e)}")

    def resume_enrichment(self) -> None:
        """Resume enrichment after pause.

        Re-adds the enrichment job to the scheduler.
        Only call if enrichment was paused with pause_enrichment().
        """
        try:
            job = self.scheduler.get_job("enrichment_job")

            if job:
                logger.warning("Enrichment is already running")
                return

            # Re-add the job
            self.scheduler.add_job(
                self.enrich_sessions,
                trigger=IntervalTrigger(seconds=10),
                id="enrichment_job",
                name="TMDB Enrichment Job",
                replace_existing=True,
                max_instances=1,  # Prevent concurrent executions
                coalesce=True,  # Skip missed runs if job takes longer than interval
                misfire_grace_time=60  # Allow up to 60 seconds before considering it a misfire
            )

            logger.info("Enrichment resumed")

        except Exception as e:
            logger.error(f"Error resuming enrichment: {str(e)}")

    def force_enrich_session(self, session_id: str) -> None:
        """Manually trigger enrichment for a specific session.

        Useful for testing or manual enrichment of a session
        without waiting for the scheduler.

        Args:
            session_id: UUID of the session to enrich

        Note: This runs synchronously in the calling thread.
        """
        db = self.db_session_factory()
        try:
            from app.services.storage import StorageService
            storage = StorageService(db)

            logger.info(f"Manually triggering enrichment for session {session_id}")
            self.enrich_session(session_id, storage)
            logger.info(f"Manual enrichment complete for session {session_id}")

        except Exception as e:
            logger.error(
                f"Error in manual enrichment: {str(e)}",
                exc_info=True
            )
        finally:
            db.close()
