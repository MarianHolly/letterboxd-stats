"""
Async Database Connection Management

This module handles:
- Async connection pooling to PostgreSQL
- Async database sessions (no threads needed)
- Dependency injection for FastAPI endpoints

Key Concepts:
- AsyncEngine: Async connection pool (true async I/O)
- AsyncSessionLocal: Async factory for creating database sessions
- get_db: FastAPI dependency that provides async sessions to endpoints

Why async?
- No thread pool needed (eliminates connection exhaustion at ~15 connections)
- True non-blocking I/O for database operations
- Scales to 100+ concurrent operations
"""

import logging
import os
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    AsyncEngine
)
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# ============================================================
# DATABASE CONNECTION CONFIGURATION
# ============================================================

# Get database URL from environment variable
# Format: postgresql+psycopg://user:password@host:port/database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://letterboxduser:securepassword@db:5432/letterboxddb"
)

# Determine if using SQLite for testing
is_sqlite = "sqlite" in DATABASE_URL

logger.info(f"Database: {'SQLite' if is_sqlite else 'PostgreSQL'}")

# ============================================================
# CREATE ASYNC ENGINE WITH CONNECTION POOLING
# ============================================================

def create_engine_instance() -> AsyncEngine:
    """Create async engine with appropriate settings."""

    engine_kwargs = {
        "echo": os.getenv("SQL_ECHO", "False").lower() == "true",
        "pool_pre_ping": True,  # Validate connections before using
        "future": True,  # SQLAlchemy 2.0 style
    }

    # SQLite-specific settings
    if is_sqlite:
        engine_kwargs.update({
            "connect_args": {"check_same_thread": False},
            "poolclass": NullPool,  # SQLite doesn't handle connection pooling well
        })
    else:
        # PostgreSQL-specific settings
        engine_kwargs.update({
            "pool_size": 20,           # Base pool size
            "max_overflow": 30,        # Max overflow beyond pool_size
            "pool_recycle": 3600,      # Recycle connections every hour
            "echo_pool": False,        # Set True to debug connection pool
        })

    logger.info(f"Creating async engine for: {DATABASE_URL}")
    return create_async_engine(DATABASE_URL, **engine_kwargs)


# Create engine instance
engine = create_engine_instance()

# ============================================================
# CREATE ASYNC SESSION FACTORY
# ============================================================

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Don't expire objects after commit
    autoflush=False,         # Explicit flushing only
)


# ============================================================
# DEPENDENCY INJECTION FOR FASTAPI
# ============================================================

async def get_db() -> AsyncSession:
    """
    FastAPI dependency that provides an async database session

    Usage in endpoints:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()

    Key behavior:
    - Opens a new async session for each request
    - Closes automatically when request completes
    - Rolls back on errors (transaction safety)
    - No threads needed (pure async I/O)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

async def init_db():
    """
    Initialize database by creating tables

    Call this once on startup to create schema.
    """
    try:
        from app.models.database import Base

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.info("Database tables initialized")

    except Exception as e:
        logger.error(f"Error initializing database: {e}", exc_info=True)
        raise


# ============================================================
# DATABASE SHUTDOWN
# ============================================================

async def close_db():
    """
    Close all connections in the pool

    Call this on application shutdown to gracefully close connections.
    """
    await engine.dispose()
    logger.info("Database connections closed")
