from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Union
from datetime import datetime
from uuid import UUID

class UploadResponse(BaseModel):
    session_id: Union[str, UUID] = Field(..., description="Session ID as UUID or string")
    status: str
    total_movies: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={UUID: lambda v: str(v)})
