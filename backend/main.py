from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import requests
import io
import os 

app = FastAPI()

# CRS - allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TMDB_API_KEY = os.getenv("TMDB_API_KEY")


@app.get("/")
async def root():
    return {"message": "Quick Letterboxt Stats API"}


@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """ Upload diary.csv and return most recent movies with TMDB data """

    # Read CSV file
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    # Get most recent movie (diary.csv has 'Watched Date')
    df['Watched Date'] = pd.to_datetime(df['Watched Date'])
    df = df.sort_values('Watched Date', ascending=False)

    # Get most recent movies
    recent = df.iloc[0]

    title = recent['Name']
    year = int(recent['Year'])
    watched_date = str(recent['Watched Date'].date())
    rating = recent['Rating'] if pd.notna(recent['Rating']) else None

    # Search TMDB
    tmdb_search_url = f"https://api.themoviedb.org/3/search/movie"
    params = {
        'api_key': TMDB_API_KEY,
        'query': title,
        'year': year
    }

    response = requests.get(tmdb_search_url, params=params)
    
    if response.status_code != 200:
        return {"error": "TMDB API failed"}
    
    results = response.json().get('results', [])

    if not results:
        return {
            "title": title,
            "year": year,
            "watched_date": watched_date,
            "rating": rating,
            "poster": None,
            "overview": None
        }
    
    # Get first result
    movie = results[0]

    return {
        "title": title,
        "year": year,
        "watched_date": watched_date,
        "rating": rating,
        "tmdb_title": movie.get('title'),
        "poster": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get('poster_path') else None,
        "overview": movie.get('overview'),
        "tmdb_rating": movie.get('vote_average'),
        "release_date": movie.get('release_date')
    }