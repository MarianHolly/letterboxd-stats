from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from dotenv import load_dotenv

# Database imports
from app.db.session import init_db, close_db, SessionLocal

# Services imports
from app.services.tmdb_client import TMDBClient
from app.services.storage import StorageService
from app.services.enrichment_worker import EnrichmentWorker

# API routes
from app.api import upload, session, test

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Letterboxd Stats API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",  # Test page runs on 3001
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check environment
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
if not TMDB_API_KEY:
    logger.warning("TMDB_API_KEY environment variable is not set!")

# Global service instances
tmdb_client = None
enrichment_worker = None

# Database startup/shutdown
@app.on_event("startup")
async def startup_event():
    """Initialize database, TMDB client, and enrichment worker on startup."""
    global tmdb_client, enrichment_worker

    try:
        # Initialize database
        init_db()
        logger.info("[OK] Database initialized")
    except Exception as e:
        logger.error(f"[ERROR] Database initialization failed: {str(e)}")
        return

    try:
        # Initialize TMDB client
        if TMDB_API_KEY:
            tmdb_client = TMDBClient(TMDB_API_KEY)
            logger.info("[OK] TMDB Client initialized")
        else:
            logger.error("[ERROR] TMDB_API_KEY not set - enrichment will not work")
            return

    except Exception as e:
        logger.error(f"[ERROR] TMDB Client initialization failed: {str(e)}")
        return

    try:
        # Initialize enrichment worker
        # Pass SessionLocal factory instead of a single session instance
        # This allows the worker to create fresh sessions for each polling cycle
        enrichment_worker = EnrichmentWorker(tmdb_client, SessionLocal)
        enrichment_worker.start_scheduler()
        logger.info("[OK] Enrichment Worker started")

    except Exception as e:
        logger.error(f"[ERROR] Enrichment Worker initialization failed: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop enrichment worker and close database on shutdown."""
    global enrichment_worker

    try:
        # Stop enrichment worker
        if enrichment_worker:
            enrichment_worker.stop_scheduler()
            logger.info("[OK] Enrichment Worker stopped")
    except Exception as e:
        logger.error(f"[ERROR] Enrichment Worker shutdown failed: {str(e)}")

    try:
        # Close database connections
        close_db()
        logger.info("[OK] Database connections closed")
    except Exception as e:
        logger.error(f"[ERROR] Database shutdown failed: {str(e)}")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API is running."""
    return {"message": "Letterboxd Stats API", "status": "running"}

# Include routers
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(session.router, prefix="/api", tags=["session"])
app.include_router(test.router, prefix="/api", tags=["test"])

# Health check
@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

# Worker status endpoint
@app.get("/worker/status")
async def worker_status():
    """Get enrichment worker status.

    Returns information about the background enrichment worker:
    - Whether it's running
    - Last execution time
    - Next scheduled execution
    """
    global enrichment_worker

    if not enrichment_worker:
        return {
            "worker_status": "not_initialized",
            "running": False,
            "message": "Enrichment worker not initialized"
        }

    status = enrichment_worker.get_status()
    return {
        "worker_status": "running" if status["running"] else "stopped",
        **status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
