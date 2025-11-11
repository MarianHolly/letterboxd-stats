"""
Database Connection Management

This module handles:
- Connection pooling to PostgreSQL
- Thread-safe database sessions
- Dependency injection for FastAPI endpoints

Key Concepts:
- Engine: Connection pool (reuses connections across requests)
- SessionLocal: Factory for creating new database sessions
- get_db: FastAPI dependency that provides sessions to endpoints
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================================
# DATABASE CONNECTION CONFIGURATION
# ============================================================

# Get database URL from environment variable
# Format: postgresql://user:password@host:port/database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://letterboxduser:securepassword@localhost:5432/letterboxddb"
)

print(f"Connecting to database: {DATABASE_URL.split('@')[1]}")  # Log connection (hide password)

# ============================================================
# CREATE ENGINE WITH CONNECTION POOLING
# ============================================================

engine = create_engine(
    DATABASE_URL,
    # Connection pooling settings:
    # - pool_size: Number of connections to keep in the pool (default: 5)
    # - max_overflow: How many connections can overflow beyond pool_size (default: 10)
    # - pool_pre_ping: Test connection before reusing (handles stale connections)
    # - echo: Log all SQL statements (set to True for debugging)
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    echo=False,  # Set to True to see all SQL statements during development
)

# ============================================================
# CREATE SESSION FACTORY
# ============================================================

SessionLocal = sessionmaker(
    autocommit=False,  # Don't auto-commit, require explicit commit
    autoflush=False,   # Don't auto-flush changes, require explicit flush
    bind=engine
)

# ============================================================
# DEPENDENCY INJECTION FOR FASTAPI
# ============================================================

def get_db() -> Session:
    """
    FastAPI dependency that provides a database session

    Usage in endpoints:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()

    Key behavior:
    - Opens a new session for each request
    - Closes automatically when request completes
    - Rolls back on errors (transaction safety)

    Why try/finally?
    - Ensures session is always closed, even if endpoint crashes
    - Prevents connection leaks
    """
    db = SessionLocal()
    try:
        yield db  # Provide session to endpoint
    finally:
        db.close()  # Always close, even if error occurred


def init_db():
    """
    Initialize database by creating all tables

    Call this once on startup to create schema if it doesn't exist.
    For production, use Alembic migrations instead.
    """
    from app.models.database import Base

    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created (if they didn't exist)")


def close_db():
    """
    Close all connections in the pool

    Call this on application shutdown to gracefully close connections.
    """
    engine.dispose()
    print("✓ Database connections closed")
