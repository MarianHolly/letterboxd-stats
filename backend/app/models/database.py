"""
Database Models for Letterboxd Stats Backend

This module defines SQLAlchemy ORM models for:
- Session: Metadata about a user's upload session
- Movie: Individual movie records parsed from CSV

Design Rationale:
- UUID for sessions (unguessable, shareable identifiers)
- One-to-many relationship (1 session : many movies)
- JSONB for flexible movie metadata (genres, directors, cast)
- Timestamps for tracking and expiry
- Cascade delete: removing session automatically removes its movies
"""

from datetime import datetime, timedelta
from sqlalchemy import (
    Column, String, Integer, Float, DateTime,
    ForeignKey, Boolean, JSON, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid

# Create base class for all models
Base = declarative_base()


class Session(Base):
    """
    Session Model - Represents a user's upload session

    Key Design Decisions:
    1. UUID as primary key instead of auto-incrementing integer
       - Reason: Session IDs are shareable in URLs, UUIDs are unguessable
       - Prevents enumeration attacks (can't guess other sessions)

    2. Status field for tracking progress (processing → enriching → completed)
       - Reason: Frontend needs to poll and show progress
       - Allows error states (failed, with error message)

    3. Denormalized total_movies count
       - Reason: Avoid expensive COUNT(*) queries during polling
       - Update count when inserting movies (small write cost, big read benefit)

    4. expires_at for automatic cleanup
       - Reason: 30-day sessions prevent unbounded database growth
       - Background task can cascade-delete expired sessions

    5. JSONB metadata field
       - Reason: Store flexible upload metadata without schema changes
       - Example: {filenames: [], file_sizes: [], user_agent: "..."}
    """
    __tablename__ = "sessions"

    # Primary key: UUID (36 chars, unique, unguessable)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Timestamps: track session lifecycle
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_accessed = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    # Status tracking: uploading → processing → enriching → completed/failed
    status = Column(
        String(20),
        default="processing",
        nullable=False,
        # Valid statuses: 'uploading', 'processing', 'enriching', 'completed', 'failed'
    )

    # Error message (populated if status='failed')
    error_message = Column(Text, nullable=True)

    # Quick stats (denormalized for speed)
    total_movies = Column(Integer, default=0, nullable=False)
    enriched_count = Column(Integer, default=0, nullable=False)

    # Flexible metadata: {filenames, file_sizes, user_agent, etc}
    metadata = Column(JSON, default={}, nullable=False)

    # Relationship: one session has many movies
    # cascade='all, delete-orphan' means: delete session → delete all its movies
    movies = relationship("Movie", back_populates="session", cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        """
        Initialize a new session with default expiry of 30 days
        """
        super().__init__(**kwargs)
        if self.expires_at is None:
            self.expires_at = datetime.utcnow() + timedelta(days=30)

    def is_expired(self) -> bool:
        """Check if this session has expired"""
        return datetime.utcnow() > self.expires_at

    def update_access_time(self):
        """Update last_accessed timestamp and extend expiry"""
        self.last_accessed = datetime.utcnow()
        # Extend expiry to 30 days from now
        self.expires_at = self.last_accessed + timedelta(days=30)

    def __repr__(self):
        return f"<Session {str(self.id)[:8]}... status={self.status} movies={self.total_movies}>"


class Movie(Base):
    """
    Movie Model - Individual movie record from uploaded CSV

    Key Design Decisions:
    1. Auto-incrementing integer as primary key
       - Reason: Fast joins, small indexes, standard practice
       - UUID would waste space since movies aren't directly shared

    2. session_id foreign key (required)
       - Reason: Every movie belongs to exactly one session
       - Query pattern: "get all movies for session X"

    3. CSV fields (title, year, rating, watched_date, etc)
       - Reason: Direct mapping from Letterboxd CSV columns
       - Nullable where users might not provide the data

    4. TMDB fields (nullable initially, populated in Phase 2)
       - Reason: Keep room for enriched metadata without schema changes
       - Example: genres=[Drama, Crime], directors=[...], cast=[...]

    5. letterboxd_uri as unique identifier
       - Reason: Letterboxd URIs uniquely identify movies
       - Useful for cross-referencing with TMDB

    Columns are organized by category:
    - Core CSV fields (always from upload)
    - TMDB enrichment fields (added later)
    - Tracking fields (for internal use)
    """
    __tablename__ = "movies"

    # Primary key: auto-incrementing integer
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign key: links to parent session (required)
    # ondelete='CASCADE' means: delete session → delete all its movies
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)

    # Relationship: back-reference to parent session
    session = relationship("Session", back_populates="movies")

    # ========== CSV Fields (from Letterboxd export) ==========

    # Title: movie name (required)
    title = Column(String(255), nullable=False)

    # Year: release year (optional - some entries don't have this)
    year = Column(Integer, nullable=True)

    # Rating: user's rating (0.5 to 5.0, half-star increments) (optional)
    rating = Column(Float, nullable=True)

    # Watched date: when user watched the movie (optional)
    watched_date = Column(DateTime, nullable=True)

    # Rewatch: whether this was a rewatch (default: false)
    rewatch = Column(Boolean, default=False, nullable=False)

    # Tags: user-assigned tags (from diary.csv)
    tags = Column(JSON, default=[], nullable=False)  # Example: ["favorite", "classic"]

    # Review: user's written review text (optional, from diary.csv)
    review = Column(Text, nullable=True)

    # Letterboxd URI: unique identifier for this movie on Letterboxd
    letterboxd_uri = Column(String(500), nullable=False)

    # ========== TMDB Enrichment Fields (Phase 2) ==========
    # These are populated later by background TMDB enrichment task

    # Whether this movie has been enriched with TMDB data
    tmdb_enriched = Column(Boolean, default=False, nullable=False)

    # TMDB movie ID (for API lookups)
    tmdb_id = Column(Integer, nullable=True)

    # TMDB fields (nullable until enriched)
    genres = Column(JSON, nullable=True)  # Example: ["Drama", "Crime", "Thriller"]
    directors = Column(JSON, nullable=True)  # Example: ["Director 1", "Director 2"]
    cast = Column(JSON, nullable=True)  # Example: ["Actor 1", "Actor 2", ...]
    runtime = Column(Integer, nullable=True)  # Movie runtime in minutes
    budget = Column(Integer, nullable=True)  # Budget in dollars
    revenue = Column(Integer, nullable=True)  # Box office revenue
    popularity = Column(Float, nullable=True)  # TMDB popularity score
    vote_average = Column(Float, nullable=True)  # TMDB vote average (0-10)

    # ========== Tracking Fields ==========

    # When this record was created
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # When TMDB enrichment happened
    enriched_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<Movie {self.title} ({self.year}) rating={self.rating}>"
