from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from dotenv import load_dotenv

# Database imports
from app.db.session import init_db, close_db

# API routes
from app.api import upload, session

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Letterboxd Stats API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check environment
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
if not TMDB_API_KEY:
    logger.warning("TMDB_API_KEY environment variable is not set!")

# Database startup/shutdown
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    try:
        init_db()
        logger.info("[OK] Database initialized")
    except Exception as e:
        logger.error(f"[ERROR] Database initialization failed: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database on shutdown."""
    try:
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

# Health check
@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
