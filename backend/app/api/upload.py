"""
File upload endpoint.

POST /api/upload - Upload Letterboxd CSV files
"""

import logging
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from io import BytesIO

from app.db.session import get_db
from app.services.csv_parser import LetterboxdParser
from app.services.storage import StorageService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload", status_code=201)
async def upload_files(
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload Letterboxd CSV files.

    Accepts:
    - watched.csv
    - ratings.csv
    - diary.csv
    - likes.csv
    """
    try:
        # Validate files
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        # Parse files
        parser = LetterboxdParser()
        all_movies = {}

        for file in files:
            content = await file.read()
            filename = file.filename.lower() if file.filename else ""

            # Convert bytes to BytesIO object for parser
            file_obj = BytesIO(content)

            # Detect file type and parse
            try:
                if "watched" in filename:
                    parsed = parser.parse_watched(file_obj)
                elif "ratings" in filename:
                    parsed = parser.parse_ratings(file_obj)
                elif "diary" in filename:
                    parsed = parser.parse_diary(file_obj)
                elif "likes" in filename:
                    parsed = parser.parse_likes(file_obj)
                else:
                    logger.warning(f"Skipping unrecognized file: {filename}")
                    continue

                # Merge parsed data by URI
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

            except Exception as e:
                logger.error(f"Error parsing file {filename}: {e}")
                raise HTTPException(status_code=400, detail=f"Error parsing {filename}: {str(e)}")

        # Convert to storage format
        movies_to_store = []
        for uri, data in all_movies.items():
            movie_data = data.get("movie", {})
            watches = data.get("watches", [{}])[0] if data.get("watches") else {}

            movies_to_store.append({
                "title": movie_data.get("title"),
                "year": movie_data.get("year"),
                "rating": watches.get("rating"),
                "watched_date": watches.get("date"),
                "letterboxd_uri": uri,
            })

        if not movies_to_store:
            raise HTTPException(status_code=400, detail="No movies found in files")

        logger.info(f"Parsed {len(movies_to_store)} movies")

        # Create session and store movies
        storage = StorageService(db)
        session_id = await storage.create_session(len(movies_to_store))
        await storage.store_movies(session_id, movies_to_store)

        # Update status to 'enriching' (signals background worker)
        await storage.update_session_status(session_id, 'enriching')

        return {
            "session_id": str(session_id),
            "status": 'enriching',
            "total_movies": len(movies_to_store)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
