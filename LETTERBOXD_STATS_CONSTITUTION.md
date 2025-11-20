# Letterboxd Stats - Project Constitution

**Version:** 1.0  
**Date:** November 19, 2025  
**Status:** Path A - Client-Side MVP

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Vision & Core Decisions](#project-vision--core-decisions)
3. [Data Structure Analysis](#data-structure-analysis)
4. [Technical Architecture](#technical-architecture)
5. [Feature Scope & Chart Specifications](#feature-scope--chart-specifications)
6. [Module Breakdown](#module-breakdown)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Success Criteria](#success-criteria)
9. [Future Evolution (Path B)](#future-evolution-path-b)

---

## 1. Executive Summary

### Project Purpose
Build a **client-side Letterboxd analytics dashboard** that transforms CSV export data into beautiful, interactive visualizations. This is **Phase 1** (Path A) of a two-phase project designed to:
1. Showcase frontend development skills (React, Next.js, data visualization)
2. Deliver a working, deployable tool within 2-3 weeks
3. Provide foundation for future backend expansion (Path B)

### Key Decision: Client-Side First
**Rationale:** You already have ~80% of a working client-side version built. Rather than starting over with a complex backend-first approach, we're **completing and polishing** the client-side MVP first, then optionally adding backend later.

### Core Philosophy
- **Ship working software fast** over building everything perfectly
- **Frontend-first development** (your strength)
- **Progressive enhancement** (add complexity when needed, not before)
- **Modular architecture** (each piece works independently)

---

## 2. Project Vision & Core Decisions

### 2.1 The Two-Path Strategy

#### ✅ **Path A: Client-Side MVP** (CURRENT FOCUS)
```
Timeline: 2-3 weeks
Complexity: Simple
Deployment: Vercel (free)
Database: None (localStorage only)
Backend: None
TMDB: None
Auth: None

Result: Complete, working portfolio piece
```

#### 🔮 **Path B: Full-Stack Extension** (FUTURE)
```
Timeline: 4-6 weeks after Path A
Complexity: High
Deployment: Vercel + Railway + Neon
Database: PostgreSQL
Backend: FastAPI
TMDB: Yes (async enrichment)
Auth: Optional (session-based, no user accounts)

Result: Production-grade application with advanced features
```

**Decision:** Build Path A first, evaluate success, then decide if Path B is needed.

---

### 2.2 Critical Questions Answered

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Authentication?** | No (Path A), Maybe (Path B) | Not needed for MVP; adds complexity without value for single-user tool |
| **TMDB Enrichment?** | No (Path A), Yes (Path B) | Cannot do securely client-side; ~60% of valuable charts work without it |
| **User Accounts?** | No | Single-user tool; localStorage sufficient for MVP |
| **Backend?** | No (Path A), Yes (Path B) | Not needed for CSV parsing and basic analytics |
| **Database?** | No (Path A), PostgreSQL (Path B) | localStorage works for temporary data; Postgres for persistence |
| **PDF Export?** | No | Out of scope for MVP |
| **Social Sharing?** | No | Out of scope for MVP |
| **Deployment?** | Vercel | Free, automatic, perfect for Next.js |

---

### 2.3 TMDB Enrichment Analysis

#### Why No TMDB in Path A?

**The Reality Check:**
- Client-side TMDB calls = **security risk** (exposed API key)
- Browser CORS restrictions = **technical barrier**
- No caching = **slow, wasteful**
- Rate limiting = **user experience problem**

**What We Lose:**
- Genre distribution charts
- Director rankings
- Actor analysis
- Country/language breakdowns
- Runtime analysis
- Budget/revenue data

**What We Keep (CSV-only data):**
- ✅ Release year distribution
- ✅ Viewing timeline (monthly/yearly)
- ✅ Rating distribution
- ✅ Decade analysis
- ✅ Rewatch patterns
- ✅ Rating evolution over time
- ✅ Most active viewing periods
- ✅ Watchlist tracking

**Conclusion:** ~60% of compelling charts work without TMDB. Ship these first.

---

## 3. Data Structure Analysis

### 3.1 Available CSV Files

Based on your actual Letterboxd export, you have:

| File | Rows | Columns | Purpose |
|------|------|---------|---------|
| `diary.csv` | ~486 | 8 | Detailed viewing logs with dates, ratings, rewatches |
| `films.csv` | ~1,623 | 4 | Complete watched history (basic) |
| `ratings.csv` | ~675 | 5 | All rated movies (includes half-stars) |
| `watched.csv` | Similar to films | 4 | Watched movies (appears similar to films.csv) |
| `watchlist.csv` | ~34 | 4 | Movies to watch |

---

### 3.2 CSV Column Structures

#### **diary.csv** (Primary Data Source)
```csv
Columns:
- Date          : Date logged on Letterboxd (YYYY-MM-DD)
- Name          : Movie title (string)
- Year          : Release year (integer)
- Letterboxd URI: Unique identifier (URL slug)
- Rating        : Your rating (0.5-5.0, or empty)
- Rewatch       : "Yes" or empty
- Tags          : Comma-separated tags (often empty)
- Watched Date  : Actual viewing date (YYYY-MM-DD)

Sample:
2025-11-12,Groundhog Day,1993,https://boxd.it/bGd2fp,5,,,2021-01-02
2025-11-12,Rookies Run Amok,1971,https://boxd.it/bGf77J,4,Yes,,2021-01-05
```

**Key Insights:**
- `Watched Date` is the true viewing date (use this for timelines)
- `Date` is when you logged it (ignore for analytics)
- `Rewatch` = "Yes" means you've seen it before
- `Rating` can be empty (not all movies rated)
- `Letterboxd URI` is the unique identifier (use as key)

---

#### **ratings.csv** (Ratings Without Dates)
```csv
Columns:
- Date          : Date rated
- Name          : Movie title
- Year          : Release year
- Letterboxd URI: Unique identifier
- Rating        : Your rating (supports decimals: 3.5, 4.0, etc.)

Sample:
2022-01-20,The Father,2020,https://boxd.it/m8Ie,5
2022-01-26,Lore,2012,https://boxd.it/41Cs,3.5
```

**Key Insights:**
- Contains movies you rated but may not have watched dates for
- Includes half-star ratings (3.5, 4.5)
- Use to supplement diary.csv ratings

---

#### **films.csv / watched.csv** (All Watched Movies)
```csv
Columns:
- Date          : Date marked as watched
- Name          : Movie title
- Year          : Release year
- Letterboxd URI: Unique identifier

Sample:
2022-01-20,The Father,2020,https://boxd.it/m8Ie
2022-01-20,Inception,2010,https://boxd.it/1skk
```

**Key Insights:**
- No ratings, no rewatch info
- Comprehensive list of all watched movies
- Use as base dataset, merge with diary/ratings

---

#### **watchlist.csv** (Want to Watch)
```csv
Columns:
- Date          : Date added to watchlist
- Name          : Movie title
- Year          : Release year
- Letterboxd URI: Unique identifier

Sample:
2025-09-22,Her,2013,https://boxd.it/4O24
```

**Key Insights:**
- Future viewing plans
- Can track watchlist progress
- Compare watched vs unwatched

---

### 3.3 Data Merge Strategy

**Priority Order:** `diary.csv` > `ratings.csv` > `films.csv`

**Algorithm:**
```typescript
1. Parse all CSVs into Movie[] arrays
2. Create Map<letterboxdURI, Movie>
3. Process films.csv first (base dataset)
4. Merge ratings.csv (add ratings where missing)
5. Merge diary.csv (overwrite with complete data)
6. Result: Unified Movie[] with all available data
```

**Conflict Resolution:**
- If movie exists in multiple files, **diary.csv wins** (most complete data)
- If rating differs, use diary.csv rating
- If watched date differs, use diary.csv date
- Letterboxd URI is the canonical unique identifier

---

### 3.4 Normalized Data Schema

```typescript
interface Movie {
  // Core identifiers
  id: string;                    // Letterboxd URI
  title: string;                 // Name
  year: number;                  // Release year
  
  // User data
  rating?: number;               // 0.5 to 5.0 (null if unrated)
  watchedDate?: Date;            // Date object (null if unknown)
  rewatch: boolean;              // true if "Yes" in diary
  tags: string[];                // Array of tags (often empty)
  
  // Metadata (computed)
  dateAdded: Date;               // When logged on Letterboxd
  decade: number;                // 1920, 1930, ..., 2020
  era: 'pre-1960' | '1960-1999' | '2000-present';
}
```

---

## 4. Technical Architecture

### 4.1 Technology Stack (Path A)

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Framework** | Next.js | 15+ | Modern React, App Router, excellent DX |
| **Language** | TypeScript | 5.x | Type safety, better tooling |
| **Styling** | Tailwind CSS | 4.x | Rapid UI development, consistent design |
| **Components** | shadcn/ui | Latest | Accessible, customizable, modern |
| **Charts** | Recharts | 2.x | React-native, composable, good for basic charts |
| **State** | Zustand | 5.x | Lightweight, localStorage persistence |
| **CSV Parsing** | PapaParse | 5.x | Robust, handles edge cases |
| **Deployment** | Vercel | - | Free, automatic, optimized for Next.js |

**No Backend. No Database. No API.**

---

### 4.2 Project Structure

```
letterboxd-stats/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── dashboard/
│   │   └── page.tsx                # Main dashboard
│   ├── analytics/                  # Future: detailed analytics
│   ├── about/
│   │   └── page.tsx                # About page
│   └── layout.tsx                  # Root layout
│
├── components/
│   ├── layout/
│   │   ├── navbar.tsx              # Top navigation
│   │   ├── footer.tsx              # Footer
│   │   └── theme-toggle.tsx        # Dark/light mode
│   │
│   ├── landing/
│   │   ├── hero-section.tsx        # Hero with CTA
│   │   ├── features-section.tsx    # Feature highlights
│   │   └── upload-modal.tsx        # CSV upload modal
│   │
│   ├── dashboard/
│   │   ├── dashboard-layout.tsx    # Layout wrapper
│   │   ├── stats-cards.tsx         # Key metrics cards
│   │   ├── empty-state.tsx         # No data state
│   │   └── charts/
│   │       ├── release-year-chart.tsx
│   │       ├── rating-distribution-chart.tsx
│   │       ├── viewing-timeline-chart.tsx
│   │       ├── decade-breakdown-chart.tsx
│   │       ├── rewatch-analysis-chart.tsx
│   │       └── calendar-heatmap.tsx
│   │
│   └── ui/                         # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ...
│
├── lib/
│   ├── csv-parser.ts               # Parse Letterboxd CSVs
│   ├── analytics-engine.ts         # Compute statistics
│   ├── data-merger.ts              # Merge multiple CSVs
│   └── types.ts                    # TypeScript types
│
├── hooks/
│   ├── use-upload-store.ts         # Zustand store
│   └── use-analytics.ts            # Analytics hook
│
├── public/
│   ├── logo.svg
│   └── screenshots/                # For README
│
└── README.md                       # Portfolio-ready docs
```

---

### 4.3 Data Flow Architecture

```
User Action: Upload CSV
    ↓
[File Input] → validate file type (.csv)
    ↓
[PapaParse] → parse CSV → raw data array
    ↓
[CSV Parser] → normalize → Movie[]
    ↓
[Data Merger] → merge multiple files → unified Movie[]
    ↓
[Zustand Store] → persist to localStorage
    ↓
[Analytics Engine] → compute statistics → Stats object
    ↓
[Dashboard] → render charts
```

**Everything happens in browser. No server calls.**

---

### 4.4 State Management (Zustand)

```typescript
// stores/upload-store.ts

interface UploadStore {
  // Raw data
  files: UploadedFile[];
  movies: Movie[];
  
  // Actions
  addFile: (file: File) => Promise<void>;
  removeFile: (id: string) => void;
  clearAll: () => void;
  
  // Computed
  hasData: boolean;
  totalMovies: number;
}

// Persistence configuration
const useUploadStore = create<UploadStore>()(
  persist(
    (set, get) => ({
      files: [],
      movies: [],
      // ... actions
    }),
    {
      name: 'letterboxd-stats',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Why Zustand + localStorage?**
- Survives page refresh
- No backend needed
- Fast read/write
- Simple API
- Works offline

---

## 5. Feature Scope & Chart Specifications

### 5.1 MVP Feature List

#### ✅ MUST HAVE (Core MVP)

| Feature | Description | Status |
|---------|-------------|--------|
| **CSV Upload** | Drag-drop or file picker for multiple CSVs | ✅ Working |
| **File Validation** | Check file format, show errors | ⚠️ Basic |
| **Data Parsing** | Parse all 5 CSV types | ⚠️ Partial |
| **Data Merging** | Combine multiple files intelligently | ❌ Todo |
| **Dashboard** | Main stats view with charts | ⚠️ 1/6 charts |
| **Stats Cards** | Total movies, avg rating, hours, period | ✅ Working |
| **6 Core Charts** | See section 5.2 | ⚠️ 1/6 done |
| **Responsive Design** | Mobile/tablet/desktop | ✅ Working |
| **Dark Mode** | Theme toggle | ✅ Working |
| **Clear Data** | Reset and re-upload | ✅ Working |
| **Landing Page** | Hero + explanation + CTA | ✅ Working |
| **About Page** | Project purpose, tech stack | ❌ Todo |

#### 🎯 NICE TO HAVE (Post-MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| Export to JSON | Download processed data | Low |
| Shareable links | Generate static link to stats | Medium |
| Print view | Printable dashboard | Low |
| Custom date range | Filter by date range | Medium |
| Compare with friends | Import someone else's JSON | Low |
| Chart customization | Toggle charts on/off | Low |

#### ❌ OUT OF SCOPE (Path B Only)

- TMDB enrichment (genre/director/actor charts)
- User authentication
- Persistent database storage
- PDF export via email
- Social media integration
- Backend API

---

### 5.2 Core Chart Specifications

#### **Chart 1: Release Year Distribution** ✅ (COMPLETE)
```typescript
Type: Bar Chart
Data Source: movie.year
X-axis: Release year (1920-2024)
Y-axis: Number of movies
Features:
  - Era filtering (pre-1960, 1960-1999, 2000-present)
  - Color coding by era
  - Hover tooltips with counts
  - Responsive bars
Recharts Component: BarChart
Estimated Time: DONE
```

---

#### **Chart 2: Rating Distribution** ⏳ (TODO)
```typescript
Type: Bar Chart
Data Source: movie.rating
X-axis: Rating (0.5, 1.0, 1.5, ..., 5.0)
Y-axis: Number of movies
Features:
  - Show only ratings with data
  - Color gradient (red → yellow → green)
  - Display percentage of total
  - Average rating line overlay
Recharts Component: BarChart + ReferenceLine
Estimated Time: 3-4 hours
```

**Data Transformation:**
```typescript
interface RatingDistribution {
  rating: number;    // 0.5, 1.0, ..., 5.0
  count: number;     // How many movies
  percentage: number; // % of rated movies
}

function computeRatingDistribution(movies: Movie[]): RatingDistribution[] {
  const rated = movies.filter(m => m.rating != null);
  const counts = new Map<number, number>();
  
  rated.forEach(m => {
    const rating = m.rating!;
    counts.set(rating, (counts.get(rating) || 0) + 1);
  });
  
  return Array.from(counts.entries())
    .map(([rating, count]) => ({
      rating,
      count,
      percentage: (count / rated.length) * 100
    }))
    .sort((a, b) => a.rating - b.rating);
}
```

---

#### **Chart 3: Viewing Timeline** ⏳ (TODO)
```typescript
Type: Area Chart / Line Chart
Data Source: movie.watchedDate
X-axis: Time (monthly or yearly)
Y-axis: Movies watched
Features:
  - Granularity toggle (yearly / monthly / weekly)
  - Time range filter (all time / last 3 years / last year)
  - Smooth curves
  - Fill gradient
  - Peak month/year annotation
Recharts Component: AreaChart or LineChart
Estimated Time: 4-5 hours
```

**Data Transformation:**
```typescript
type Granularity = 'yearly' | 'monthly' | 'weekly';

interface TimelinePoint {
  date: string;      // "2023" or "2023-01" or "2023-W01"
  count: number;     // Movies watched
  label: string;     // Display label
}

function computeTimeline(
  movies: Movie[], 
  granularity: Granularity
): TimelinePoint[] {
  const withDates = movies.filter(m => m.watchedDate != null);
  const counts = new Map<string, number>();
  
  withDates.forEach(m => {
    const key = formatDate(m.watchedDate!, granularity);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  
  return Array.from(counts.entries())
    .map(([date, count]) => ({
      date,
      count,
      label: formatLabel(date, granularity)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
```

---

#### **Chart 4: Decade Breakdown** ⏳ (TODO)
```typescript
Type: Bar Chart (Horizontal)
Data Source: movie.decade
X-axis: Number of movies
Y-axis: Decade (1920s, 1930s, ..., 2020s)
Features:
  - Only show decades with data
  - Percentage annotations
  - Color by era (vintage vs modern)
  - Sort by count (most watched at top)
Recharts Component: BarChart (layout="vertical")
Estimated Time: 2-3 hours
```

**Data Transformation:**
```typescript
interface DecadeData {
  decade: string;    // "1920s", "1930s", ...
  count: number;
  percentage: number;
  era: 'classic' | 'golden' | 'modern' | 'contemporary';
}

function computeDecadeBreakdown(movies: Movie[]): DecadeData[] {
  const counts = new Map<number, number>();
  
  movies.forEach(m => {
    const decade = Math.floor(m.year / 10) * 10;
    counts.set(decade, (counts.get(decade) || 0) + 1);
  });
  
  const total = movies.length;
  
  return Array.from(counts.entries())
    .map(([decade, count]) => ({
      decade: `${decade}s`,
      count,
      percentage: (count / total) * 100,
      era: classifyEra(decade)
    }))
    .sort((a, b) => b.count - a.count); // Most watched first
}
```

---

#### **Chart 5: Rewatch Analysis** ⏳ (TODO)
```typescript
Type: Mixed (Bar + List)
Data Source: movie.rewatch
Display:
  - Pie chart: Rewatched vs First-time
  - List: Most rewatched movies (if tracked per-watch)
Features:
  - Count total rewatches
  - Percentage of rewatches
  - Highlight favorite rewatch movies
Recharts Component: PieChart + custom list
Estimated Time: 3-4 hours
```

**Data Transformation:**
```typescript
interface RewatchStats {
  totalWatches: number;
  firstTimeWatches: number;
  rewatches: number;
  rewatchRate: number;    // Percentage
  topRewatchedMovies: {
    title: string;
    year: number;
    rewatchCount: number;
  }[];
}

function computeRewatchStats(movies: Movie[]): RewatchStats {
  const rewatches = movies.filter(m => m.rewatch);
  
  return {
    totalWatches: movies.length,
    firstTimeWatches: movies.length - rewatches.length,
    rewatches: rewatches.length,
    rewatchRate: (rewatches.length / movies.length) * 100,
    topRewatchedMovies: [] // If tracking per-watch, group by title
  };
}
```

---

#### **Chart 6: Calendar Heatmap** ⏳ (TODO)
```typescript
Type: Calendar Heatmap (like GitHub contributions)
Data Source: movie.watchedDate
Display:
  - Grid: Week rows × Day columns
  - Color intensity: 0 movies (light) → many movies (dark)
  - Year selector
Features:
  - Hover: Date + movie count + titles
  - Click: Show movies watched that day
  - Identify marathon weekends
  - Highlight longest streaks
Component: Custom (using d3 or nivo)
Estimated Time: 6-8 hours (most complex)
```

**Data Transformation:**
```typescript
interface DayData {
  date: string;           // "2023-01-15"
  count: number;          // Movies watched
  movies: string[];       // Movie titles
  intensity: number;      // 0-4 (for color)
}

function computeCalendarData(
  movies: Movie[], 
  year: number
): DayData[] {
  const withDates = movies.filter(m => 
    m.watchedDate && 
    m.watchedDate.getFullYear() === year
  );
  
  const byDate = new Map<string, Movie[]>();
  
  withDates.forEach(m => {
    const key = formatDate(m.watchedDate!, 'YYYY-MM-DD');
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(m);
  });
  
  const maxCount = Math.max(...Array.from(byDate.values()).map(arr => arr.length));
  
  return Array.from(byDate.entries()).map(([date, movies]) => ({
    date,
    count: movies.length,
    movies: movies.map(m => m.title),
    intensity: Math.ceil((movies.length / maxCount) * 4)
  }));
}
```

---

### 5.3 Stats Cards (Already Working ✅)

| Stat | Computation | Display |
|------|-------------|---------|
| **Total Movies** | `movies.length` | Large number + "films watched" |
| **Average Rating** | `sum(ratings) / count(rated)` | X.X ⭐ + bar indicator |
| **Total Hours** | `movies.length * 110 / 60` (estimated) | XXX hours + film reel icon |
| **Tracking Period** | `max(date) - min(date)` | "X years Y months" |
| **This Month** | Count movies in current month | XX films + "+X% vs last month" |

---

## 6. Module Breakdown

Each module should be independently testable and demostrable.

### 6.1 Module 1: CSV Parser Library ⭐

**Purpose:** Parse Letterboxd CSV exports into normalized format

**Input:** 
- File object(s) from file upload
- Or raw CSV string

**Output:**
```typescript
Movie[] // Normalized movie objects
```

**Location:** `lib/csv-parser.ts`

**Key Functions:**
```typescript
// Parse single CSV file
function parseCSV(content: string, type: CSVType): Movie[]

// Detect CSV type by columns
function detectCSVType(headers: string[]): CSVType

// Validate CSV structure
function validateCSV(headers: string[]): ValidationResult

// Main entry point
export function parseLetterboxdCSV(file: File): Promise<Movie[]>
```

**Testing:**
- Unit tests with sample CSVs
- Edge cases: missing columns, empty ratings, invalid dates
- Performance: 1000+ row files

**Time Estimate:** 4-6 hours

---

### 6.2 Module 2: Data Merger

**Purpose:** Combine multiple CSV files into unified dataset

**Input:**
```typescript
{
  diary?: Movie[];
  ratings?: Movie[];
  watched?: Movie[];
  films?: Movie[];
}
```

**Output:**
```typescript
Movie[] // Merged, deduplicated
```

**Location:** `lib/data-merger.ts`

**Key Functions:**
```typescript
// Merge multiple sources
function mergeMovieSources(sources: MovieSources): Movie[]

// Deduplicate by Letterboxd URI
function deduplicateMovies(movies: Movie[]): Movie[]

// Resolve conflicts (diary > ratings > watched)
function resolveConflicts(existing: Movie, incoming: Movie): Movie
```

**Testing:**
- Same movie in multiple files
- Conflicting ratings
- Missing data in some sources

**Time Estimate:** 3-4 hours

---

### 6.3 Module 3: Analytics Engine ⭐

**Purpose:** Compute all statistics from movie data

**Input:**
```typescript
Movie[] // Processed movie list
```

**Output:**
```typescript
interface AnalyticsData {
  overview: OverviewStats;
  ratings: RatingDistribution[];
  timeline: TimelinePoint[];
  decades: DecadeData[];
  rewatches: RewatchStats;
  calendar: DayData[];
}
```

**Location:** `lib/analytics-engine.ts`

**Key Functions:**
```typescript
// Compute all analytics at once
export function computeAnalytics(movies: Movie[]): AnalyticsData

// Individual computations
function computeOverview(movies: Movie[]): OverviewStats
function computeRatingDistribution(movies: Movie[]): RatingDistribution[]
function computeTimeline(movies: Movie[], granularity: Granularity): TimelinePoint[]
function computeDecades(movies: Movie[]): DecadeData[]
function computeRewatches(movies: Movie[]): RewatchStats
function computeCalendar(movies: Movie[], year: number): DayData[]
```

**Testing:**
- Empty dataset
- Single movie
- Large dataset (1000+ movies)
- Missing ratings/dates

**Time Estimate:** 6-8 hours

---

### 6.4 Module 4: Chart Components Library

**Purpose:** Reusable, tested chart components

**Input:** Processed analytics data

**Output:** Rendered React components

**Location:** `components/dashboard/charts/`

**Components:**
- `ReleaseYearChart.tsx` ✅ (done)
- `RatingDistributionChart.tsx`
- `ViewingTimelineChart.tsx`
- `DecadeBreakdownChart.tsx`
- `RewatchAnalysisChart.tsx`
- `CalendarHeatmap.tsx`

**Shared Props Interface:**
```typescript
interface ChartProps {
  data: any;              // Chart-specific data
  loading?: boolean;      // Show skeleton
  error?: string;         // Error message
  height?: number;        // Chart height
  interactive?: boolean;  // Enable tooltips/clicks
}
```

**Testing:**
- Storybook with mock data
- Responsive behavior
- Empty state
- Error state

**Time Estimate:** 2-3 hours per chart = 10-15 hours total

---

### 6.5 Module 5: Upload & Storage (Zustand)

**Purpose:** Manage uploaded files and parsed data

**Location:** `hooks/use-upload-store.ts`

**State:**
```typescript
interface UploadStore {
  // Files
  files: UploadedFile[];
  
  // Processed data
  movies: Movie[];
  analytics: AnalyticsData | null;
  
  // UI state
  loading: boolean;
  error: string | null;
  
  // Actions
  uploadFiles: (files: File[]) => Promise<void>;
  clearData: () => void;
  removeFile: (id: string) => void;
}
```

**Persistence:**
```typescript
// Persist to localStorage
const useUploadStore = create<UploadStore>()(
  persist(
    (set, get) => ({ /* state */ }),
    {
      name: 'letterboxd-stats-storage',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Time Estimate:** 2-3 hours

---

## 7. Implementation Roadmap

### Phase 1: Complete Core Functionality (Week 1)

#### **Day 1-2: Data Processing Pipeline**
- [ ] **Task 1.1:** Complete CSV parser for all 5 file types (4h)
  - Parse diary.csv
  - Parse ratings.csv
  - Parse watched.csv / films.csv
  - Parse watchlist.csv
  - Handle edge cases (missing columns, empty values)
  
- [ ] **Task 1.2:** Implement data merger (3h)
  - Merge multiple sources
  - Deduplicate by Letterboxd URI
  - Resolve conflicts (diary > ratings > watched)
  - Test with your actual data

- [ ] **Task 1.3:** Test with your actual CSVs (1h)
  - Upload all 5 files
  - Verify merge logic
  - Check data integrity

**Deliverable:** Upload CSVs → See merged data in console

---

#### **Day 3-4: Analytics Engine**
- [ ] **Task 1.4:** Implement analytics computations (6h)
  - Overview stats (total, avg, hours, period)
  - Rating distribution
  - Viewing timeline (yearly, monthly)
  - Decade breakdown
  - Rewatch analysis
  - Calendar data
  
- [ ] **Task 1.5:** Test analytics with your data (2h)
  - Verify calculations
  - Check edge cases
  - Log results to console

**Deliverable:** Analytics object with all stats

---

#### **Day 5-7: Charts Implementation**
- [ ] **Task 1.6:** Rating Distribution Chart (3h)
  - Component structure
  - Data transformation
  - Recharts BarChart
  - Styling and tooltips

- [ ] **Task 1.7:** Viewing Timeline Chart (4h)
  - Granularity toggle (yearly/monthly)
  - Data transformation
  - Recharts AreaChart
  - Time range filtering

- [ ] **Task 1.8:** Decade Breakdown Chart (2h)
  - Horizontal bars
  - Percentage labels
  - Era color coding

- [ ] **Task 1.9:** Rewatch Analysis (3h)
  - Pie chart (rewatched vs first-time)
  - Stats display
  - List of rewatched movies (if applicable)

- [ ] **Task 1.10:** Calendar Heatmap (6h)
  - Grid layout (week × day)
  - Color intensity
  - Hover tooltips
  - Year selector
  - *Note: Most complex chart, consider using library (react-calendar-heatmap)*

**Deliverable:** 5 additional charts working (6 total)

---

### Phase 2: Polish & UX (Week 2)

#### **Day 8-9: UI Refinement**
- [ ] **Task 2.1:** Improve upload flow (3h)
  - Better drag-drop UI
  - File validation messages
  - Loading states
  - Success confirmation

- [ ] **Task 2.2:** Dashboard layout optimization (3h)
  - Grid system for charts
  - Responsive breakpoints
  - Scroll behavior
  - Chart ordering

- [ ] **Task 2.3:** Empty states (2h)
  - No data uploaded
  - No ratings (for rating chart)
  - No dates (for timeline)
  - Helpful messaging

- [ ] **Task 2.4:** Error handling (2h)
  - Invalid CSV format
  - Parse errors
  - Unsupported file types
  - Clear error messages

**Deliverable:** Professional, polished UI

---

#### **Day 10-11: Additional Pages**
- [ ] **Task 2.5:** About page (2h)
  - Project purpose
  - Technology stack
  - Features list
  - Contact/GitHub link

- [ ] **Task 2.6:** Guide page (2h)
  - How to export from Letterboxd
  - How to upload
  - What each chart shows
  - FAQs

- [ ] **Task 2.7:** Landing page improvements (2h)
  - Better hero copy
  - Feature highlights
  - Screenshots
  - Clear CTA

**Deliverable:** Complete multi-page site

---

#### **Day 12-14: Testing & Deployment**
- [ ] **Task 2.8:** Testing (4h)
  - Test all charts with your data
  - Test on mobile devices
  - Test empty states
  - Test error scenarios
  - Cross-browser testing

- [ ] **Task 2.9:** README documentation (3h)
  - Project overview
  - Screenshots/GIFs
  - Installation instructions
  - Tech stack explanation
  - Future roadmap

- [ ] **Task 2.10:** Deploy to Vercel (2h)
  - Create Vercel project
  - Connect GitHub repo
  - Configure build settings
  - Test production build
  - Custom domain (optional)

**Deliverable:** Live, deployed application

---

### Phase 3: Final Polish (Week 3)

#### **Day 15-17: Refinements**
- [ ] **Task 3.1:** Performance optimization (3h)
  - Lazy load charts
  - Memoize computations
  - Optimize bundle size
  - Check Lighthouse scores

- [ ] **Task 3.2:** Accessibility (3h)
  - Keyboard navigation
  - ARIA labels
  - Color contrast
  - Screen reader testing

- [ ] **Task 3.3:** Animation & transitions (3h)
  - Chart enter animations
  - Page transitions
  - Loading skeletons
  - Smooth interactions

- [ ] **Task 3.4:** Screenshots & demo content (2h)
  - Take high-quality screenshots
  - Create demo GIF/video
  - Update README
  - Create social preview image

**Deliverable:** Portfolio-ready application

---

#### **Day 18-21: Buffer & Extras**
- [ ] **Task 3.5:** Optional features (time permitting)
  - Export to JSON
  - Print-friendly view
  - Shareable links
  - Custom date range filters

- [ ] **Task 3.6:** Portfolio presentation prep (2h)
  - Prepare talking points
  - Document technical decisions
  - Create architecture diagram
  - Write blog post (optional)

**Deliverable:** Interview-ready project

---

## 8. Success Criteria

### 8.1 MVP Completion Checklist

#### ✅ **Functional Requirements**
- [ ] Can upload 1-5 CSV files
- [ ] CSV parsing works for all file types
- [ ] Data merges correctly (no duplicates)
- [ ] All 6 charts render with real data
- [ ] Stats cards show correct numbers
- [ ] Works on mobile (responsive)
- [ ] Dark/light theme works
- [ ] Can clear data and re-upload
- [ ] No console errors
- [ ] Deployed with public URL

#### ✅ **Quality Requirements**
- [ ] Loading states for all async operations
- [ ] Error messages are helpful
- [ ] Empty states guide user
- [ ] Charts are interactive (tooltips, hover)
- [ ] UI is polished and consistent
- [ ] Code is organized and readable
- [ ] No obvious bugs

#### ✅ **Portfolio Requirements**
- [ ] README has screenshots
- [ ] Live demo link works
- [ ] Code is on GitHub (public)
- [ ] Can explain all technical choices
- [ ] Can do live demo without prep
- [ ] Talking points prepared

---

### 8.2 Definition of Done

**A feature is DONE when:**
1. Code is written and working
2. Tested with real data (your CSVs)
3. Responsive (works on mobile)
4. Has loading/error/empty states
5. Code is committed to Git
6. Deployed to staging (Vercel preview)

**The PROJECT is DONE when:**
1. All MVP features complete ✅
2. Deployed to production
3. README is portfolio-ready
4. Can be demoed in < 5 minutes
5. You're proud to show it

---

## 9. Future Evolution (Path B)

### 9.1 When to Consider Path B

**Consider building Path B if:**
- Path A is complete and you want to showcase backend skills
- You have 4-6 additional weeks
- You want TMDB-powered charts (genre, director, actor)
- You need persistent storage (sessions > 30 days)
- You want to enable sharing with unique URLs

**Path B adds:**
- FastAPI backend
- PostgreSQL database
- TMDB API integration (async enrichment)
- Session-based storage
- Shareable analytics links
- Progress tracking UI
- Background job processing

---

### 9.2 Migration Strategy (Path A → Path B)

**Keep from Path A:**
- ✅ All React components (reuse)
- ✅ Chart components (reuse)
- ✅ UI/UX design (reuse)
- ✅ CSV parser (port to Python)
- ✅ Analytics logic (port to Python)

**Add for Path B:**
- ⚡ FastAPI backend
- ⚡ PostgreSQL models
- ⚡ TMDB client
- ⚡ Background worker (enrichment)
- ⚡ Session API endpoints
- ⚡ Progress polling UI

**New Architecture:**
```
Frontend (Path A)
    ↓
  Upload CSV
    ↓
Backend (NEW)
    ↓
PostgreSQL (NEW)
    ↓
TMDB API (NEW)
    ↓
Enhanced Charts (NEW)
```

---

### 9.3 Path B Features

**New Charts (TMDB-powered):**
- Genre Distribution Pie Chart
- Top Directors Bar Chart
- Actor Collaboration Network
- Country/Language Map
- Runtime Distribution
- Budget vs Box Office
- Critical Acclaim (TMDB rating vs yours)

**New Features:**
- Shareable links (`/stats/abc-123-xyz`)
- Session persistence (30 days)
- Progress bar during enrichment
- Batch processing (faster enrichment)
- Compare sessions (if multiple uploads)

---

## 10. Appendix

### 10.1 Quick Reference

**Key Files:**
- `lib/csv-parser.ts` - Parse Letterboxd CSVs
- `lib/data-merger.ts` - Merge multiple sources
- `lib/analytics-engine.ts` - Compute statistics
- `hooks/use-upload-store.ts` - State management
- `components/dashboard/charts/` - Chart components
- `app/dashboard/page.tsx` - Main dashboard

**Commands:**
```bash
# Development
npm run dev

# Build
npm run build

# Deploy
git push origin main  # Auto-deploys on Vercel

# Test
npm run test  # (if you add tests)
```

---

### 10.2 Tech Stack Justification

| Technology | Why Chosen |
|-----------|-----------|
| **Next.js** | Modern React framework, great DX, free deployment |
| **TypeScript** | Type safety prevents bugs, better IDE support |
| **Tailwind** | Rapid styling, consistent design system |
| **shadcn/ui** | Beautiful, accessible, customizable components |
| **Recharts** | React-native charts, composable, good enough for MVP |
| **Zustand** | Simplest state management, localStorage built-in |
| **PapaParse** | Battle-tested CSV parser, handles edge cases |
| **Vercel** | Free, automatic deployment, optimized for Next.js |

**Not Chosen:**
- ❌ Redux - Too complex for this use case
- ❌ Chart.js - Not React-native, harder to customize
- ❌ D3.js - Overkill for MVP, steep learning curve
- ❌ Backend - Not needed for MVP (Path A)

---

### 10.3 Data Privacy

**Important:**
- All data processed **locally in browser**
- No data sent to any server
- localStorage can be cleared anytime
- No tracking, no analytics (unless you add them)
- Letterboxd URI contains no personal data

**For Path B:**
- Sessions expire after 30 days
- No user accounts = no email/password storage
- Session IDs are random UUIDs (unguessable)
- Optional: Add banner explaining data handling

---

### 10.4 Known Limitations (Path A)

| Limitation | Reason | Workaround |
|-----------|--------|-----------|
| **No TMDB data** | Cannot call API client-side securely | Wait for Path B, or focus on CSV-only charts |
| **localStorage limit** | ~5-10MB max | Should be fine for CSV data; warn if > 2000 movies |
| **No sharing** | No backend to store data | Export JSON, share via file |
| **No persistence** | localStorage can be cleared | User must re-upload |
| **Single device** | localStorage doesn't sync | Expected for client-side tool |

---

### 10.5 Contact & Resources

**GitHub Repo:** [Your repo URL]  
**Live Demo:** [Vercel URL]  
**Author:** Marian (Stupel)  
**Letterboxd:** stupel

**Resources:**
- [Letterboxd API Docs](https://letterboxd.com/api-docs/) (for future)
- [TMDB API](https://www.themoviedb.org/documentation/api) (for Path B)
- [Next.js Docs](https://nextjs.org/docs)
- [Recharts Examples](https://recharts.org/en-US/examples)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## ✅ Action Items

### This Week:
1. ✅ Review this constitution
2. ⬜ Set up Git repository (if not done)
3. ⬜ Audit current codebase (what works vs what needs fixing)
4. ⬜ Start with Day 1-2 tasks (CSV parser + data merger)

### Next Week:
5. ⬜ Complete analytics engine
6. ⬜ Build remaining 5 charts
7. ⬜ Polish UI/UX

### Week After:
8. ⬜ Add About/Guide pages
9. ⬜ Test thoroughly
10. ⬜ Deploy to Vercel
11. ⬜ Write README
12. ⬜ Ship it! 🚀

---

**Remember:** Ship Path A first. Evaluate. Then decide on Path B.

**Focus:** Finish what you started. A polished simple tool > an incomplete complex one.

**Goal:** Portfolio-ready application in 2-3 weeks that showcases your frontend skills.

---

**End of Constitution v1.0**
