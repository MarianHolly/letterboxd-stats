from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

class MovieResponse(BaseModel):
    title: str
    year: Optional[int] = None
    rating: Optional[float] = None
    watched_date: Optional[date] = None
    rewatch: bool
    tags: List[str]
    review: Optional[str] = None
    letterboxd_uri: str
    genres: Optional[List[str]] = None
    directors: Optional[List[str]] = None
    cast: Optional[List[str]] = None
    runtime: Optional[int] = None

    class Config:
        from_attributes = True

class MoviesListResponse(BaseModel):
    movies: List[MovieResponse]
    total: int
    page: int
    per_page: int

class SessionStatusResponse(BaseModel):
    session_id: str
    status: str
    total_movies: int
    enriched_count: int
    created_at: datetime
    expires_at: datetime
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class SessionDetailsResponse(BaseModel):
    session_id: str
    status: str
    total_movies: int
    enriched_count: int
    created_at: datetime
    expires_at: datetime
    metadata: Optional[dict] = None

    class Config:
        from_attributes = True
