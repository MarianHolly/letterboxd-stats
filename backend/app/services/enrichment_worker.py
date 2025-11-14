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
                max_instances=1  # Prevent concurrent executions
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
        It finds all sessions with status='enriching' and processes them.

        Flow:
        1. Get all sessions with status='enriching'
        2. For each session:
           a. Get all unenriched movies
           b. For each movie, enrich it
           c. Update progress counter
           d. Mark session as 'completed' when done
        3. Log summary of what was processed

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

            # Process each session
            for session in sessions:
                try:
                    self.enrich_session(session.id, storage)

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

            return {
                'running': self.scheduler.running,
                'last_run': job.last_execution_time if job else None,
                'next_run': job.next_run_time if job else None,
                'interval': 10  # seconds
            }

        except Exception as e:
            logger.error(f"Error getting worker status: {str(e)}")
            return {
                'running': False,
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
                max_instances=1
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
