from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import logging
from dotenv import load_dotenv

# Database imports
from app.db.session import init_db, close_db

# Services imports
from app.services.tmdb_client import TMDBClient
from app.services.enrichment_worker import EnrichmentWorker

# API routes
from app.api import upload, session

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check environment
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
if not TMDB_API_KEY:
    logger.warning("TMDB_API_KEY environment variable is not set!")

# Global service instances
tmdb_client = None
enrichment_worker = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown lifecycle for FastAPI app.

    Replaces:
    @app.on_event("startup")
    @app.on_event("shutdown")
    """
    global tmdb_client, enrichment_worker

    # Startup
    logger.info("Starting Letterboxd Stats API")

    try:
        # Initialize database
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        raise

    try:
        # Initialize TMDB client
        tmdb_client = TMDBClient()
        await tmdb_client.start()
        logger.info("TMDB client started")
    except Exception as e:
        logger.error(f"TMDB client initialization failed: {e}", exc_info=True)
        raise

    try:
        # Start enrichment worker
        enrichment_worker = EnrichmentWorker(tmdb_client)
        await enrichment_worker.start()
        logger.info("Enrichment worker started")
    except Exception as e:
        logger.error(f"Enrichment worker initialization failed: {e}", exc_info=True)
        raise

    logger.info("All services initialized")

    yield  # Application runs here

    # Shutdown
    logger.info("Shutting down")

    try:
        # Stop enrichment worker
        if enrichment_worker:
            await enrichment_worker.stop()
            logger.info("Enrichment worker stopped")
    except Exception as e:
        logger.error(f"Enrichment worker shutdown failed: {e}", exc_info=True)

    try:
        # Close TMDB client
        if tmdb_client:
            await tmdb_client.stop()
            logger.info("TMDB client closed")
    except Exception as e:
        logger.error(f"TMDB client shutdown failed: {e}", exc_info=True)

    try:
        # Close database
        await close_db()
        logger.info("Database closed")
    except Exception as e:
        logger.error(f"Database shutdown failed: {e}", exc_info=True)

    logger.info("Shutdown complete")


# Create FastAPI app with lifespan
app = FastAPI(
    title="Letterboxd Stats API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API is running."""
    return {"message": "Letterboxd Stats API", "status": "running"}

# Health check
@app.get("/health")
async def health():
    """Health check endpoint."""
    global enrichment_worker
    return {
        "status": "healthy",
        "enrichment_running": enrichment_worker._running if enrichment_worker else False
    }

# Include routers
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(session.router, prefix="/api", tags=["session"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
