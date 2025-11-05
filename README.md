# 📊 Letterboxd Stats Analytics

A full-stack web application that transforms your Letterboxd viewing history into beautiful, interactive analytics and insights. Upload your Letterboxd CSV exports to unlock comprehensive statistics about your movie-watching habits.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-316192?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)

---

## 🎬 Overview

Letterboxd offers premium analytics, but this application goes further—providing **free, comprehensive insights** into your viewing history with enhanced visualizations and custom metrics. Perfect for cinephiles who want to understand their watching patterns, discover trends, and showcase their movie journey.

### Why This Project?

- **🔓 Free Access**: No premium Letterboxd subscription required
- **📈 Enhanced Analytics**: Beyond what Letterboxd Pro offers
- **🎨 Beautiful Visualizations**: Interactive charts powered by shadcn/ui
- **🔄 Enriched Data**: TMDB API integration for directors, cast, runtime, countries, and genres
- **📋 Custom Lists**: Track progress on iconic film lists (AFI 100, Oscar Winners, etc.)
- **💾 Persistent Storage**: Save your analytics, update anytime

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Charts**: Recharts / Chart.js
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Language**: Python 3.11
- **Database**: PostgreSQL 15
- **ORM**: SQLAlchemy
- **Data Processing**: Pandas, NumPy
- **External API**: [TMDB API](https://www.themoviedb.org/documentation/api)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway / Render
- **Database**: Neon / Supabase (PostgreSQL)
- **Caching**: Redis (optional, for TMDB responses)

---

## 📖 How to Use

### 1. Export Your Letterboxd Data
1. Log in to [Letterboxd](https://letterboxd.com)
2. Go to **Settings** → **Import & Export**
3. Click **Export Your Data**
4. Download the ZIP file and extract the CSVs

### 2. Upload to Letterboxd Stats
1. Register/Login to the application
2. Navigate to **Dashboard** → **Upload Data**
3. Select your CSV files:
   - `watched.csv` (required)
   - `ratings.csv` (optional, for rating analysis)
   - `diary.csv` (optional, for timeline data)
4. Click **Upload & Analyze**

### 3. Explore Your Stats
- View your personalized dashboard
- Filter by year, genre, rating
- Explore interactive charts
- Export analytics as PDF (future feature)

---

## 📊 Sample Analytics

### Movies Watched Over Time
Track your viewing habits month-by-month and identify your most active periods.

### Genre Distribution
Discover which genres dominate your watchlist—are you a thriller enthusiast or a drama devotee?

### Rating Patterns
Analyze your rating tendencies: Are you generous (avg 4+) or a tough critic?

### Decade Analysis
See which era of cinema you prefer—Golden Age Hollywood or modern blockbusters?

### Director Rankings
Your top 10 most-watched directors with complete filmography stats.

---

## 🔐 Security & Privacy

- **Your data stays private**: All analytics are user-specific and isolated
- **No third-party sharing**: Your viewing history is never shared
- **Secure authentication**: JWT-based auth with bcrypt password hashing
- **Optional account deletion**: Delete your data anytime

---

## 🙏 Acknowledgments

- [Letterboxd](https://letterboxd.com) for the amazing platform
- [TMDB](https://www.themoviedb.org/) for comprehensive movie data
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
