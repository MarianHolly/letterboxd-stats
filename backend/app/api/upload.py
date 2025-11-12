from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from typing import List
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.csv_parser import LetterboxdParser
from app.services.storage import StorageService
from app.schemas.upload import UploadResponse

router = APIRouter()

@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_csv(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    """Upload CSV files and create session."""
    
    # Validate files provided
    if not files or all(f.filename == "" for f in files):
        raise HTTPException(status_code=400, detail="No files provided")

    try:
        # Validate file types
        valid_extensions = {".csv", ".zip"}
        for file in files:
            ext = "." + (file.filename.split(".")[-1].lower() if file.filename else "")
            if ext not in valid_extensions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type: {file.filename}. Only CSV and ZIP files allowed."
                )

        # Create session
        storage = StorageService(db)
        files_list = [f.filename for f in files]
        session_id = storage.create_session(metadata={"files": files_list})

        # Parse files
        parser = LetterboxdParser()
        all_movies = {}

        for file in files:
            content = await file.read()
            filename = file.filename.lower()

            # Detect file type
            if "watched" in filename:
                parsed = parser.parse_watched(content)
            elif "ratings" in filename:
                parsed = parser.parse_ratings(content)
            elif "diary" in filename:
                parsed = parser.parse_diary(content)
            elif "likes" in filename:
                parsed = parser.parse_likes(content)
            else:
                parsed = {}

            # Merge parsed data
            for uri, data in parsed.items():
                if uri not in all_movies:
                    all_movies[uri] = data
                else:
                    # Merge logic
                    if data.get("watches"):
                        all_movies[uri].setdefault("watches", []).extend(data["watches"])
                    if data.get("ratings"):
                        all_movies[uri].setdefault("ratings", []).extend(data["ratings"])
                    if data.get("likes"):
                        all_movies[uri].setdefault("likes", []).extend(data["likes"])

        # Convert to storage format
        movies_to_store = []
        for uri, data in all_movies.items():
            movie_data = data.get("movie", {})
            watches = data.get("watches", [{}])[0]  # Take most recent watch

            movies_to_store.append({
                "title": movie_data.get("title"),
                "year": movie_data.get("year"),
                "rating": watches.get("rating"),
                "watched_date": watches.get("watched_date"),
                "letterboxd_uri": uri,
                "rewatch": watches.get("rewatch", False),
                "tags": watches.get("tags", []),
                "review": watches.get("review")
            })

        # Store movies
        if movies_to_store:
            storage.store_movies(session_id, movies_to_store)
            storage.update_session_status(session_id, "enriching")

        # Get session
        session = storage.get_session(session_id)
        
        return UploadResponse(
            session_id=session.id,
            status=session.status,
            total_movies=session.total_movies,
            created_at=session.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
