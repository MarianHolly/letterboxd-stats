# Architecture Diagrams - Letterboxd Stats

Visual representations of the system architecture, data flows, and component relationships.

---

## 1. System Architecture (High Level)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                USER BROWSER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    NEXT.JS FRONTEND APPLICATION                      │  │
│  │                    (React 19 + TypeScript)                           │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ Routes:                                                        │ │  │
│  │  │  • GET  /              → Landing page (upload UI)             │ │  │
│  │  │  • GET  /dashboard     → Analytics dashboard                 │ │  │
│  │  │  • GET  /analytics     → Advanced analytics (WIP)            │ │  │
│  │  │  • GET  /test          → Test/dev page                       │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ State Management (Zustand):                                    │ │  │
│  │  │  • UploadStore                                                 │ │  │
│  │  │    ├─ csvData: string (raw file content)                      │ │  │
│  │  │    ├─ metadata: FileMetadata (name, type, size)               │ │  │
│  │  │    └─ LocalStorage persistence                                │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ Data Processing (Hooks):                                       │ │  │
│  │  │                                                                │ │  │
│  │  │  useAnalytics(csvString) → {                                  │ │  │
│  │  │    totalMovies: number                                        │ │  │
│  │  │    averageRating: number                                      │ │  │
│  │  │    totalHours: number                                         │ │  │
│  │  │    ratingDistribution: Record<rating, count>                 │ │  │
│  │  │    genreDistribution: Record<genre, count>                   │ │  │
│  │  │    moviesPerMonth: Record<month, count>                      │ │  │
│  │  │    yearsWatched: Record<year, count>                         │ │  │
│  │  │    topWatchDates: Array<Date>                                │ │  │
│  │  │    favoriteGenre: string                                      │ │  │
│  │  │  }                                                             │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ CSV Processing (Libraries):                                    │ │  │
│  │  │                                                                │ │  │
│  │  │  PapaParse (CSV Parsing)                                      │ │  │
│  │  │    ↓                                                           │ │  │
│  │  │  csv-parser.ts (Validation & Type Detection)                 │ │  │
│  │  │    ├─ validateCSV(data): boolean                             │ │  │
│  │  │    ├─ detectFileType(filename): 'watched'|'ratings'|'diary'  │ │  │
│  │  │    └─ parseCSV(data): Movie[]                                │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ Component Hierarchy:                                           │ │  │
│  │  │                                                                │ │  │
│  │  │  Layout/                                                       │ │  │
│  │  │  ├─ Navbar (Theme toggle, navigation)                         │ │  │
│  │  │  ├─ Footer (Copyright, links)                                 │ │  │
│  │  │  └─ ThemeProvider (Dark/light mode)                           │ │  │
│  │  │                                                                │ │  │
│  │  │  Landing/                                                      │ │  │
│  │  │  ├─ HeroSection (CTA, description)                            │ │  │
│  │  │  ├─ AboutSection (Project info)                               │ │  │
│  │  │  ├─ StepsSection (How-to guide)                               │ │  │
│  │  │  └─ UploadModal (File input, validation)                      │ │  │
│  │  │                                                                │ │  │
│  │  │  Dashboard/                                                    │ │  │
│  │  │  ├─ DashboardLayout (Sidebar + content)                       │ │  │
│  │  │  ├─ DashboardSidebar (Nav links)                              │ │  │
│  │  │  ├─ DashboardHeader (Title, description)                      │ │  │
│  │  │  ├─ StatsCard (Metric displays)                               │ │  │
│  │  │  ├─ DashboardSection (Content wrapper)                        │ │  │
│  │  │  ├─ EmptyState (No data guidance)                             │ │  │
│  │  │  ├─ LoadingSkeleton (Loading states)                          │ │  │
│  │  │  └─ Charts/                                                    │ │  │
│  │  │     ├─ ReleaseYearAnalysis (✅ implemented)                    │ │  │
│  │  │     ├─ GenreDistribution (⏳ placeholder)                      │ │  │
│  │  │     ├─ RatingDistribution (⏳ placeholder)                     │ │  │
│  │  │     └─ ViewingOverTime (⏳ placeholder)                        │ │  │
│  │  │                                                                │ │  │
│  │  │  Analytics/                                                    │ │  │
│  │  │  ├─ AnalyticsSidebar (Nav links)                              │ │  │
│  │  │  ├─ AnalyticsHeader (Title)                                   │ │  │
│  │  │  ├─ AnalyticsEmptyState (No data state)                       │ │  │
│  │  │  └─ AnalyticsSkeleton (Loading state)                         │ │  │
│  │  │                                                                │ │  │
│  │  │  UI/ (shadcn/ui primitives)                                    │ │  │
│  │  │  ├─ Button, Input, Card, Dialog                               │ │  │
│  │  │  ├─ Dropdown, Tooltip, Badge                                  │ │  │
│  │  │  └─ Table, Skeleton, Progress                                 │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ HTTP Client (Axios):                                           │ │  │
│  │  │  • POST /upload → Upload CSV to backend                       │ │  │
│  │  │  • GET  / → Health check                                      │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                              ↓ HTTPS ↓                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                              localhost:3000


┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API SERVER                                │
│                        (FastAPI + Python 3.11)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Routes & Endpoints:                                                 │  │
│  │                                                                      │  │
│  │  GET /                                                              │  │
│  │  └─ Returns: {"message": "Letterboxd Stats API"}                   │  │
│  │     Purpose: Health check                                           │  │
│  │                                                                      │  │
│  │  POST /upload                                                       │  │
│  │  ├─ Input: UploadFile (CSV file)                                   │  │
│  │  ├─ Processing:                                                     │  │
│  │  │  1. Read file using Pandas                                      │  │
│  │  │  2. Validate columns (Name, Watched Date)                       │  │
│  │  │  3. Sort by Watched Date descending                             │  │
│  │  │  4. Extract most recent movie                                   │  │
│  │  │  5. Search TMDB API with title + year                           │  │
│  │  │  6. Fetch movie details (genres, runtime, etc)                  │  │
│  │  │  7. Fetch credits (cast: top 5, directors: top 3)               │  │
│  │  │  8. Return enriched response                                     │  │
│  │  └─ Returns: MovieData (JSON)                                       │  │
│  │     Purpose: CSV file upload with TMDB enrichment                  │  │
│  │                                                                      │  │
│  │  CORS Middleware                                                    │  │
│  │  └─ Allows: http://localhost:3000                                  │  │
│  │     Methods: GET, POST, PUT, DELETE, OPTIONS                       │  │
│  │     Headers: All                                                     │  │
│  │                                                                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Data Processing Pipeline:                                           │  │
│  │                                                                      │  │
│  │  CSV File Input                                                     │  │
│  │       ↓                                                             │  │
│  │  Pandas pd.read_csv()                                              │  │
│  │       ↓                                                             │  │
│  │  Validate Required Columns                                         │  │
│  │       ↓                                                             │  │
│  │  Sort by Watched Date                                              │  │
│  │       ↓                                                             │  │
│  │  Extract Most Recent Movie                                         │  │
│  │       ↓                                                             │  │
│  │  TMDB API Search (title + year)                                    │  │
│  │       ↓                                                             │  │
│  │  [IF FOUND]                                                         │  │
│  │       ↓                                                             │  │
│  │  Fetch /movie/{id} details                                         │  │
│  │       ↓                                                             │  │
│  │  Fetch /movie/{id}/credits                                         │  │
│  │       ↓                                                             │  │
│  │  Combine & Return MovieData JSON                                   │  │
│  │                                                                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Error Handling:                                                     │  │
│  │                                                                      │  │
│  │  ✓ CSV Parser Errors → 400 Bad Request                            │  │
│  │  ✓ Missing Columns → 400 Bad Request                              │  │
│  │  ✓ TMDB API Failures → 200 (graceful fallback)                    │  │
│  │  ✓ Unexpected Errors → 500 Internal Server Error                  │  │
│  │                                                                      │  │
│  │  All errors logged with context                                    │  │
│  │                                                                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                              ↓ HTTPS ↓                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                              localhost:8000


┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL SERVICES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TMDB API (The Movie Database)                                             │
│  ├─ GET /3/search/movie (search by title + year)                           │
│  ├─ GET /3/movie/{id} (fetch movie details)                               │
│  ├─ GET /3/movie/{id}/credits (fetch cast & crew)                         │
│  └─ Image URLs: https://image.tmdb.org/t/p/w500{poster_path}             │
│                 https://image.tmdb.org/t/p/w1280{backdrop_path}           │
│                                                                             │
│  [Future] PostgreSQL Database                                              │
│  ├─ User accounts & authentication                                         │
│  ├─ Data persistence                                                       │
│  └─ Analytics history                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. User Interaction Flow

```
START (User visits app)
  ↓
  ├─→ [Landing Page] /
  │   ├─ Display: Hero section, About, Steps, Upload button
  │   ├─ User sees: Project description & how to use
  │   └─ Action: Click "Upload CSV" or drag-drop file
  │
  ├─→ [CSV File Selection]
  │   ├─ User selects watched.csv from their computer
  │   └─ [File Size Check]
  │       ├─ < 10MB? → Continue
  │       └─ > 10MB? → Show warning (may be slow)
  │
  ├─→ [CSV Validation - Frontend]
  │   ├─ Check file extension (.csv) ✓
  │   ├─ Check file type by name ✓
  │   ├─ Parse using PapaParse ✓
  │   ├─ Validate column structure ✓
  │   ├─ Check required fields ✓
  │   │
  │   └─ [Validation Result]
  │       ├─ VALID → Continue
  │       ├─ INVALID → Show error message, ask user to fix
  │       └─ INVALID FORMAT → Show example of expected format
  │
  ├─→ [Store Data Locally - Zustand]
  │   ├─ Save CSV content to UploadStore
  │   ├─ Save metadata (filename, type, size, date)
  │   ├─ Persist to localStorage
  │   └─ [Modal closes]
  │
  ├─→ [Automatic Navigation]
  │   └─ Redirect to /dashboard
  │
  ├─→ [Dashboard Page] /dashboard
  │   ├─ Load CSV data from store (instant, no API call)
  │   ├─ [Compute Metrics - Frontend]
  │   │   ├─ useAnalytics hook processes CSV
  │   │   ├─ Calculates: totals, averages, distributions
  │   │   └─ Takes <1ms for typical data
  │   │
  │   ├─ [Display Metrics]
  │   │   ├─ Total Movies: {number}
  │   │   ├─ Average Rating: {number}
  │   │   ├─ Total Hours: {number}
  │   │   └─ Tracking Period: {date range}
  │   │
  │   ├─ [Display Charts]
  │   │   ├─ Release Year Analysis (✅ working)
  │   │   │   ├─ Filter by era (pre-1960, 1960-1999, 2000+)
  │   │   │   └─ Show bar chart with color coding
  │   │   │
  │   │   ├─ Genre Distribution (⏳ to be implemented)
  │   │   ├─ Rating Distribution (⏳ to be implemented)
  │   │   └─ Viewing Over Time (⏳ to be implemented)
  │   │
  │   ├─ [File Management]
  │   │   ├─ Show: "File uploaded: {filename}"
  │   │   └─ Options: View details, Clear data
  │   │
  │   └─ [User Can]
  │       ├─ Interact with charts (hover for details)
  │       ├─ Filter by era/time period
  │       ├─ View metrics side-by-side
  │       ├─ Clear data and start over
  │       └─ Navigate to Analytics page (via sidebar)
  │
  ├─→ [Optional] Send Data to Backend
  │   ├─ User clicks "Enrich with TMDB"
  │   ├─ Frontend sends most recent movie to backend
  │   ├─ Backend searches TMDB API
  │   ├─ Returns: poster, genres, cast, directors, etc.
  │   └─ Display enriched movie card
  │
  ├─→ [Navigation]
  │   ├─ Can go to: Analytics, Settings (future), etc.
  │   ├─ Can toggle dark/light mode
  │   ├─ Can come back to landing page
  │   └─ Data persists in localStorage
  │
  └─→ [Session End]
      ├─ User closes tab/browser
      ├─ Data remains in localStorage
      ├─ Next visit: Data automatically restored
      └─ Or: User clicks "Clear Data" to reset
```

---

## 3. Component Dependency Graph

```
App (Root)
│
├─ ThemeProvider
│  └─ Navbar
│     └─ ThemeToggle
│        └─ (toggles dark/light mode)
│
├─ Route: / (Landing)
│  ├─ HeroSection
│  ├─ AboutSection
│  ├─ StepsSection
│  └─ UploadModal
│     ├─ Input (file input)
│     ├─ Button (upload trigger)
│     └─ Zustand: useUploadStore
│        └─ Stores: csvData, metadata
│
├─ Route: /dashboard
│  ├─ DashboardLayout
│  │  ├─ DashboardSidebar
│  │  │  └─ Navigation Links
│  │  │
│  │  └─ Main Content
│  │     ├─ DashboardHeader
│  │     │  └─ Page title + description
│  │     │
│  │     ├─ [IF no data]
│  │     │  └─ EmptyState
│  │     │     └─ Message + "Upload CSV" button
│  │     │
│  │     ├─ [IF loading]
│  │     │  └─ LoadingSkeleton
│  │     │
│  │     ├─ [IF data exists]
│  │     │  │
│  │     │  ├─ DashboardSection
│  │     │  │  ├─ Title: "Key Metrics"
│  │     │  │  └─ StatsCard (×4)
│  │     │  │     ├─ Total Movies
│  │     │  │     ├─ Average Rating
│  │     │  │     ├─ Total Hours
│  │     │  │     └─ Tracking Period
│  │     │  │
│  │     │  ├─ DashboardSection
│  │     │  │  ├─ Title: "Release Year Analysis"
│  │     │  │  └─ ReleaseYearAnalysis (✅)
│  │     │  │     ├─ Era filter buttons
│  │     │  │     └─ Recharts BarChart
│  │     │  │
│  │     │  ├─ DashboardSection
│  │     │  │  ├─ Title: "Genre Distribution"
│  │     │  │  └─ GenreDistribution (⏳)
│  │     │  │     └─ Recharts PieChart
│  │     │  │
│  │     │  ├─ DashboardSection
│  │     │  │  ├─ Title: "Rating Distribution"
│  │     │  │  └─ RatingDistribution (⏳)
│  │     │  │     └─ Recharts BarChart
│  │     │  │
│  │     │  ├─ DashboardSection
│  │     │  │  ├─ Title: "Viewing Over Time"
│  │     │  │  └─ ViewingOverTime (⏳)
│  │     │  │     └─ Recharts AreaChart
│  │     │  │
│  │     │  └─ DashboardSection
│  │     │     ├─ Title: "File Management"
│  │     │     ├─ File info display
│  │     │     └─ Clear button
│  │     │
│  │     └─ Hooks Used:
│  │        ├─ useUploadStore → Get CSV data
│  │        └─ useAnalytics → Compute metrics
│  │
│  └─ Footer
│
├─ Route: /analytics
│  ├─ DashboardLayout
│  │  ├─ AnalyticsSidebar
│  │  │
│  │  └─ Main Content
│  │     ├─ AnalyticsHeader
│  │     │
│  │     ├─ [IF no data]
│  │     │  └─ AnalyticsEmptyState
│  │     │
│  │     ├─ [IF loading]
│  │     │  └─ AnalyticsSkeleton
│  │     │
│  │     └─ [Content sections - TBD]
│  │
│  └─ Footer
│
└─ Footer (on all pages)
   └─ Copyright, links, etc.
```

---

## 4. Data Structure Flow

```
CSV File (Letterboxd Export)
│
├─ Raw Content
│  └─ "Name,Watched Date,Rating,Year,Genres\n..."
│
├─ [Frontend: PapaParse]
│  └─ Parsed JSON Array
│
├─ [Frontend: csv-parser.ts]
│  ├─ Validate structure
│  └─ Convert to Movie objects
│
├─ [Zustand Store]
│  ├─ Store raw CSV
│  ├─ Store metadata
│  └─ Persist to localStorage
│
├─ [useAnalytics Hook]
│  │
│  ├─ Input: Movie[]
│  │
│  ├─ Computation 1: Total Movies
│  │  └─ Output: number
│  │
│  ├─ Computation 2: Average Rating
│  │  └─ Output: number
│  │
│  ├─ Computation 3: Total Hours
│  │  └─ Output: number (estimated)
│  │
│  ├─ Computation 4: Rating Distribution
│  │  ├─ Group by rating (1-5 stars)
│  │  └─ Output: Record<rating, count>
│  │     {
│  │       "1.0": 5,
│  │       "2.0": 10,
│  │       "3.0": 45,
│  │       "4.0": 150,
│  │       "5.0": 200
│  │     }
│  │
│  ├─ Computation 5: Genre Distribution
│  │  ├─ Split genres (comma/pipe separated)
│  │  ├─ Count occurrences
│  │  └─ Output: Record<genre, count>
│  │     {
│  │       "Action": 120,
│  │       "Drama": 95,
│  │       "Comedy": 80,
│  │       ...
│  │     }
│  │
│  ├─ Computation 6: Movies Per Month
│  │  ├─ Group by YYYY-MM
│  │  └─ Output: Record<month, count>
│  │     {
│  │       "2023-01": 15,
│  │       "2023-02": 12,
│  │       ...
│  │     }
│  │
│  ├─ Computation 7: Years Watched
│  │  ├─ Extract release year
│  │  ├─ Count by year & decade
│  │  └─ Output: Record<year, count>
│  │     {
│  │       "1950": 2,
│  │       "2000": 45,
│  │       "2023": 120,
│  │       ...
│  │     }
│  │
│  ├─ Computation 8: Top Watch Dates
│  │  ├─ Find dates with most watches
│  │  └─ Output: Date[]
│  │
│  └─ Computation 9: Favorite Genre
│     ├─ Find most-watched genre
│     └─ Output: string
│
├─ [Charts]
│  │
│  ├─ ReleaseYearAnalysis
│  │  ├─ Input: yearsWatched
│  │  ├─ Recharts BarChart
│  │  └─ Output: Rendered bar chart
│  │
│  ├─ GenreDistribution
│  │  ├─ Input: genreDistribution
│  │  ├─ Recharts PieChart
│  │  └─ Output: Rendered pie chart
│  │
│  ├─ RatingDistribution
│  │  ├─ Input: ratingDistribution
│  │  ├─ Recharts BarChart
│  │  └─ Output: Rendered bar chart
│  │
│  └─ ViewingOverTime
│     ├─ Input: moviesPerMonth
│     ├─ Recharts AreaChart
│     └─ Output: Rendered area chart
│
└─ [Backend] (Optional enrichment)
   │
   ├─ Input: Movie (most recent)
   │  └─ { title, year, watchedDate, rating }
   │
   ├─ TMDB API Search
   │  └─ GET /3/search/movie?query=title&year=year
   │
   ├─ TMDB API Details
   │  └─ GET /3/movie/{id}
   │
   ├─ TMDB API Credits
   │  └─ GET /3/movie/{id}/credits
   │
   └─ Output: Enriched Movie
      {
        "title": "...",
        "tmdb_title": "...",
        "poster": "https://...",
        "backdrop": "https://...",
        "overview": "...",
        "tmdb_rating": 7.5,
        "genres": ["Action", "Sci-Fi"],
        "runtime": 148,
        "cast": [...],
        "directors": [...]
      }
```

---

## 5. Directory Structure Tree

```
letterboxd-stats/
│
├── 📁 frontend/
│   ├── 📁 app/                          # Next.js App Router pages
│   │   ├── 📁 (auth)/                   # Auth routes (future)
│   │   ├── 📁 analytics/
│   │   │   └── page.tsx                # /analytics page (WIP)
│   │   ├── 📁 dashboard/
│   │   │   └── page.tsx                # /dashboard page
│   │   ├── 📁 test/
│   │   │   └── page.tsx                # /test page (dev)
│   │   ├── page.tsx                    # / landing page
│   │   └── layout.tsx                  # Root layout
│   │
│   ├── 📁 components/                   # React components (38 files)
│   │   ├── 📁 ui/                      # shadcn/ui primitives
│   │   ├── 📁 layout/                  # Layout components
│   │   ├── 📁 dashboard/               # Dashboard components
│   │   │   └── 📁 charts/             # Chart components
│   │   │       ├── release-year-analysis.tsx        ✅
│   │   │       ├── genre-distribution.tsx           ⏳
│   │   │       ├── rating-distribution.tsx          ⏳
│   │   │       └── viewing-over-time.tsx            ⏳
│   │   ├── 📁 analytics/               # Analytics page components
│   │   └── 📁 landing/                 # Landing page components
│   │
│   ├── 📁 hooks/                        # Custom React hooks
│   │   ├── use-analytics.ts            # Metrics computation
│   │   ├── use-upload-store.ts         # Zustand store
│   │   └── use-mobile.ts               # Mobile detection
│   │
│   ├── 📁 lib/                         # Utility functions
│   │   ├── csv-parser.ts               # CSV validation
│   │   └── utils.ts                    # Tailwind utilities
│   │
│   ├── 📁 public/                      # Static assets
│   ├── 📁 __tests__/                   # Jest tests
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📄 next.config.ts
│   ├── 📄 tailwind.config.ts
│   ├── 📄 jest.config.ts
│   ├── 📄 .eslintrc.json
│   └── 📄 Dockerfile
│
├── 📁 backend/
│   ├── 📄 main.py                      # FastAPI app + routes
│   ├── 📄 requirements.txt              # Dependencies
│   ├── 📁 tests/
│   │   ├── test_api_endpoints.py
│   │   └── test_csv_parsing.py
│   ├── 📄 pytest.ini
│   └── 📄 Dockerfile
│
├── 📁 docs/                            # Documentation
│   ├── 📄 TECHNICAL_ANALYSIS.md        # This analysis (comprehensive)
│   ├── 📄 PROJECT_STATUS_SUMMARY.md    # Quick status
│   ├── 📄 NEXT_STEPS.md                # Implementation roadmap
│   └── 📄 ARCHITECTURE_DIAGRAMS.md     # This file
│
├── 📁 e2e/                             # E2E tests
├── 📄 docker-compose.yml               # Container orchestration
├── 📄 .env                             # Environment variables
├── 📄 playwright.config.ts             # E2E test config
├── 📄 README.md                        # Main documentation
└── 📄 .gitignore
```

---

## 6. State Management Flow (Zustand)

```
UploadStore (Zustand)
│
├─ State:
│  ├─ csvData: string | null
│  │  └─ Contains raw CSV file content
│  │
│  └─ metadata: FileMetadata | null
│     ├─ filename: string
│     ├─ fileType: 'watched' | 'ratings' | 'diary'
│     ├─ fileSize: number
│     └─ uploadedAt: Date
│
├─ Actions:
│  ├─ setCsvData(data: string) → void
│  │  └─ Sets CSV content, triggers localStorage update
│  │
│  ├─ setMetadata(data: FileMetadata) → void
│  │  └─ Sets file metadata, triggers localStorage update
│  │
│  └─ clear() → void
│     └─ Clears all data, removes from localStorage
│
├─ Persistence:
│  └─ localStorage with key "upload-store"
│
└─ Usage:
   │
   ├─ In UploadModal:
   │  └─ const { csvData, metadata, setCsvData } = useUploadStore()
   │
   ├─ In Dashboard:
   │  └─ const { csvData } = useUploadStore()
   │     useAnalytics(csvData) → compute metrics
   │
   └─ In Analytics Page:
      └─ const { csvData } = useUploadStore()
         render sections based on csvData existence
```

---

## 7. Deployment Architecture (Future)

```
┌─────────────────────────────────────────────────────────────────┐
│                          USERS                                   │
│                      (Around the world)                          │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
                        [DNS Resolution]
                                 ↓
              ┌──────────────────────────────────┐
              │        CDN (Optional)             │
              │    [Cloudflare / CloudFront]     │
              └──────────────────────────────────┘
                                 ↓
    ┌────────────────────────────┬────────────────────────────┐
    ↓                            ↓                            ↓
[Frontend]                  [Backend]                    [Database]
(Vercel)                   (Railway/Render)          (Neon/Supabase)
│                          │                         │
├─ Next.js App             ├─ FastAPI Server        ├─ PostgreSQL 15
├─ Built & deployed        ├─ Python 3.11 + Uvicorn ├─ Managed
├─ Auto-scaling            ├─ Auto-restart on crash ├─ Backup/restore
├─ Global CDN              ├─ Environment vars      ├─ SSL/TLS
└─ API routes to backend   └─ CORS configured       └─ Connection pooling
                                 ↓
                        [External APIs]
                                 ↓
                        [TMDB API]
                                 ↓
                    [Movie Metadata]

Note: Currently database is not used (localhost only)
      Production deployment requires setting up PostgreSQL
```

---

## 8. Feature Implementation Checklist

```
MVP Features (Current State):
├─ Landing Page                              ✅ Complete
│  ├─ Hero section
│  ├─ About section
│  ├─ Steps guide
│  └─ Upload modal
│
├─ Dashboard Layout                          ✅ Complete
│  ├─ Sidebar navigation
│  ├─ Header component
│  ├─ Stats cards
│  └─ Empty state
│
├─ CSV Upload                                ✅ Complete
│  ├─ File selection (drag-drop)
│  ├─ Validation
│  ├─ Local storage
│  └─ Error handling
│
├─ Metrics Computation                       ✅ Complete
│  ├─ Total movies
│  ├─ Average rating
│  ├─ Total hours
│  ├─ Rating distribution
│  ├─ Genre distribution
│  ├─ Timeline data
│  └─ Release year analysis
│
├─ Charts                                    ⏳ 25% Complete
│  ├─ Release Year                           ✅ Done
│  ├─ Genre Distribution                     ⏳ Structure only
│  ├─ Rating Distribution                    ⏳ Structure only
│  └─ Viewing Over Time                      ⏳ Structure only
│
├─ Backend API                               ✅ Complete
│  ├─ File upload endpoint
│  ├─ CSV processing
│  └─ TMDB enrichment
│
├─ Theme Support                             ✅ Complete
│  ├─ Dark mode
│  ├─ Light mode
│  └─ Toggle switch
│
└─ Responsive Design                         ✅ Complete
   ├─ Mobile
   ├─ Tablet
   └─ Desktop


Phase 2 Features (Not started):
├─ Analytics Page Completion                 ⏳ 10% (structure only)
│  ├─ Viewing patterns
│  ├─ Genre deep dive
│  └─ Director analysis
│
├─ Additional Pages                          ⏳ 0%
│  ├─ /dashboard/patterns
│  ├─ /dashboard/genres
│  ├─ /dashboard/settings
│  └─ /dashboard/upload
│
└─ Backend Enhancements                      ⏳ 0%
   ├─ Multi-file upload
   ├─ Data merge (ratings + diary)
   └─ Computed aggregations


Phase 3+ Features (Future):
├─ Database Integration                      ❌ Not started
│  ├─ PostgreSQL schema
│  ├─ Migrations
│  └─ API integration
│
├─ User Authentication                       ❌ Not started
│  ├─ Registration
│  ├─ Login (JWT)
│  └─ Protected routes
│
├─ Data Persistence                          ❌ Not started
│  ├─ Save to database
│  ├─ User-specific data
│  └─ Historical tracking
│
├─ Export Functionality                      ❌ Not started
│  ├─ PDF export
│  ├─ CSV export
│  └─ Share link
│
└─ Advanced Features                         ❌ Not started
   ├─ Viewing streaks
   ├─ Social sharing
   └─ Comparisons
```

---

This architecture provides a complete view of how Letterboxd Stats is organized and functions.
Key points:
- **Frontend:** Client-heavy, instant processing
- **Backend:** Lightweight API for enrichment
- **Data:** Processed locally, optional TMDB enhancement
- **State:** Persistent localStorage for session continuity
- **Extensibility:** Ready for database, auth, and additional features
