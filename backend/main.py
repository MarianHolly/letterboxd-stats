from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import requests
import io
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS - allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
if not TMDB_API_KEY:
    logger.warning("TMDB_API_KEY environment variable is not set!")


@app.get("/")
async def root():
    return {"message": "Letterboxd Stats API"}


@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """ Upload diary.csv and return most recent movie with TMDB data """

    try:
        # Read CSV file
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))

        logger.info(f"CSV loaded. Columns: {df.columns.tolist()}")
        logger.info(f"DataFrame shape: {df.shape}")

        # Check required columns
        if 'Watched Date' not in df.columns:
            logger.error(f"'Watched Date' column not found. Available columns: {df.columns.tolist()}")
            return JSONResponse(
                status_code=400,
                content={"error": "'Watched Date' column not found in CSV"}
            )

        if 'Name' not in df.columns:
            logger.error(f"'Name' column not found. Available columns: {df.columns.tolist()}")
            return JSONResponse(
                status_code=400,
                content={"error": "'Name' column not found in CSV"}
            )

        # Get most recent movie (diary.csv has 'Watched Date')
        df['Watched Date'] = pd.to_datetime(df['Watched Date'])
        df = df.sort_values('Watched Date', ascending=False)

        # Get most recent movie
        recent = df.iloc[0]

        title = str(recent['Name']).strip()
        year = int(recent['Year']) if 'Year' in recent and pd.notna(recent['Year']) else None
        watched_date = str(recent['Watched Date'].date())
        rating = float(recent['Rating']) if 'Rating' in recent and pd.notna(recent['Rating']) else None

        logger.info(f"Processing movie: {title} ({year})")

        # Default response structure
        movie_data = {
            "title": title,
            "year": year,
            "watched_date": watched_date,
            "rating": rating,
            "tmdb_title": None,
            "poster": None,
            "overview": None,
            "tmdb_rating": None,
            "release_date": None
        }

        # Search TMDB if API key is available
        if not TMDB_API_KEY:
            logger.warning("TMDB_API_KEY not set, returning data without TMDB enrichment")
            return movie_data

        tmdb_search_url = "https://api.themoviedb.org/3/search/movie"
        params = {
            'api_key': TMDB_API_KEY,
            'query': title,
        }

        if year:
            params['year'] = year

        try:
            response = requests.get(tmdb_search_url, params=params, timeout=10)

            if response.status_code != 200:
                logger.warning(f"TMDB API returned status {response.status_code}")
                return movie_data

            results = response.json().get('results', [])

            if not results:
                logger.info(f"No TMDB results found for: {title}")
                return movie_data

            # Get first result
            movie = results[0]

            movie_data.update({
                "tmdb_title": movie.get('title'),
                "poster": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get('poster_path') else None,
                "overview": movie.get('overview'),
                "tmdb_rating": movie.get('vote_average'),
                "release_date": movie.get('release_date')
            })

            logger.info(f"Successfully enriched with TMDB data")

        except requests.RequestException as e:
            logger.error(f"TMDB API request failed: {str(e)}")
            return movie_data

        return movie_data

    except pd.errors.ParserError as e:
        logger.error(f"CSV parsing error: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={"error": f"Failed to parse CSV: {str(e)}"}
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )