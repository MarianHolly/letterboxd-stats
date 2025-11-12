from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UploadResponse(BaseModel):
    session_id: str
    status: str
    total_movies: int
    created_at: datetime

    class Config:
        from_attributes = True
