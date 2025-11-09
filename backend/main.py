from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import requests
import io

app = FastAPI()

# CRS - allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TMDB_API_KEY = ""

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
