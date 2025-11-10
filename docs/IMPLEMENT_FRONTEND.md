DETAILED FRONTEND IMPLEMENTATION PLAN

  I. LANDING PAGE (Hero + Upload Portal)

  Design Foundation: prototype4 (shape-landing-hero.tsx + dropzone2.tsx)

  Structure:
  ┌─────────────────────────────────────────┐
  │        HERO SECTION (Full Screen)        │
  │  - Elegant animated background shapes   │
  │  - Title: "Transform Your Letterboxd"   │
  │  - Subtitle: About project uniqueness   │
  │  - Badge: "Free Analytics"              │
  └─────────────────────────────────────────┘
  │                                         │
  │        ABOUT SECTION                    │
  │  - 3-4 key value propositions           │
  │  - Icons + short descriptions           │
  │  - Why this vs Letterboxd Premium       │
  └─────────────────────────────────────────┘
  │                                         │
  │        STEPS/PROCESS SECTION            │
  │  Step 1: Export from Letterboxd         │
  │  Step 2: Upload CSV files               │
  │  Step 3: View analytics                 │
  └─────────────────────────────────────────┘
  │                                         │
  │        UPLOAD PORTAL (Dialog/Modal)     │
  │  - Multi-file dropzone                  │
  │  - File list with type badges           │
  │  - Progress indicators                  │
  │  - "Continue to Dashboard" button       │
  └─────────────────────────────────────────┘

  Key Components to Build:
  1. HeroSection - Adapt from prototype4's HeroGeometric
    - Customize title/description for Letterboxd context
    - Keep animated gradient shapes
  2. AboutSection - New component
    - Icon cards for: Free, Enriched Data, Custom Analytics, Privacy
  3. StepsSection - New component
    - Timeline/card-based flow showing 3 steps
  4. UploadModal - Adapt from prototype4's dropzone2.tsx
    - Multi-file support (maxFiles: 3)
    - File type indicators (watched.csv, ratings.csv, diary.csv)
    - Optional files (show what's required vs recommended)
    - Progress bar during upload
    - Error messages per file

  ---
  II. MULTIPLE FILE UPLOAD LOGIC

  Backend Changes Needed:
  - Modify /upload endpoint to accept multiple files
  - File type recognition by filename
  - Separate processing pipeline per file type
  - Aggregated response format

  Frontend Upload Manager:
  // Hook: useMultiFileUpload
  - Track files by type (watched, ratings, diary)
  - Validate filenames
  - Upload progress per file
  - Error handling per file
  - Persist state across redirect

  // State structure:
  {
    watched: { file, status, progress, error },
    ratings: { file, status, progress, error },
    diary: { file, status, progress, error }
  }

  ---
  III. DASHBOARD LAYOUT (Aggregated Analytics)

  Design Foundation: prototype2 (app-sidebar.tsx) + prototype1 & 3 (various charts)

  Structure:
  ┌──────────────────────────────────────────────────────┐
  │ SIDEBAR (Collapsible)                                │
  │ - Letterboxd Stats Logo                              │
  │ - Navigation sections:                               │
  │   • Overview (default)                               │
  │   • Viewing Patterns                                 │
  │   • Genres & Directors                               │
  │   • Lists & Collections                              │
  │   • Settings                                         │
  │ - Data upload status (optional)                      │
  └──────────────────────────────────────────────────────┘
                            │
                            ▼
  ┌──────────────────────────────────────────────────────┐
  │ MAIN CONTENT AREA                                    │
  │                                                      │
  │ ┌────────────────────────────────────────────────┐  │
  │ │ HEADER: "Your Letterboxd Analytics"            │  │
  │ │ - Upload date / Last updated                   │  │
  │ │ - Re-upload button (top-right)                 │  │
  │ └────────────────────────────────────────────────┘  │
  │                                                      │
  │ ┌────────────────────────────────────────────────┐  │
  │ │ STATS CARDS (Key Metrics)                      │  │
  │ │ - Total movies watched                         │  │
  │ │ - Average rating                               │  │
  │ │ - Total hours watched                          │  │
  │ │ - Favorite genre                               │  │
  │ └────────────────────────────────────────────────┘  │
  │                                                      │
  │ ┌────────────────────────────────────────────────┐  │
  │ │ PRIMARY CHART: Viewing Over Time                │  │
  │ │ (Area/Line chart - prototype3)                 │  │
  │ │ - Toggle: Yearly/Monthly/Weekly                │  │
  │ │ - Toggle: All Time / 3 Years / 12 Months      │  │
  │ └────────────────────────────────────────────────┘  │
  │                                                      │
  │ ┌──────────────────┬──────────────────────────────┐ │
  │ │ GENRE DISTRIBUTION   │ RELEASE YEAR ANALYSIS     │ │
  │ │ (Pie - prototype3)   │ (Bar - prototype3)        │ │
  │ │                      │                           │ │
  │ │ Shows top genres     │ Which decades you         │ │
  │ │                      │ prefer watching           │ │
  │ └──────────────────┴──────────────────────────────┘ │
  │                                                      │
  │ ┌────────────────────────────────────────────────┐  │
  │ │ SEASONAL PATTERNS (Radar - prototype3)        │  │
  │ │ Jan-Dec viewing habits overlaid by year       │  │
  │ └────────────────────────────────────────────────┘  │
  │                                                      │
  │ ┌──────────────────┬──────────────────────────────┐ │
  │ │ TOP DIRECTORS         │ RATING DISTRIBUTION       │ │
  │ │ (Radial - proto3)    │ (Custom metric)            │ │
  │ │                      │                            │ │
  │ │ Directors you watch  │ How you rate movies        │ │
  │ │ most frequently      │ (distribution/tendency)    │ │
  │ └──────────────────┴──────────────────────────────┘ │
  │                                                      │
  └──────────────────────────────────────────────────────┘

  Dashboard Pages (via sidebar navigation):
  1. Overview (Main dashboard above)
  2. Viewing Patterns
    - Detailed time-series chart
    - Day of week heatmap (if diary.csv provided)
    - Monthly/yearly trends
  3. Genres & Directors
    - Genre breakdown with filtering
    - Director stats
    - Cross-genre analysis
  4. Lists & Collections (future)
    - Progress on famous film lists (AFI 100, etc.)

  ---
  IV. COMPONENT CHECKLIST

  To Build/Adapt:

  | Component           | Source                  | Status | Notes                                  |
  |---------------------|-------------------------|--------|----------------------------------------|
  | LandingHero         | proto4                  | Adapt  | Customize copy, keep animations        |
  | AboutSection        | New                     | Build  | 4 icon cards with descriptions         |
  | StepsSection        | New                     | Build  | Step-by-step process visual            |
  | UploadDialog        | proto4 dropzone2        | Adapt  | Multi-file, file type badges, progress |
  | DashboardLayout     | proto2 sidebar          | Adapt  | Collapsible sidebar, content area      |
  | StatsCard           | proto1                  | Adapt  | Key metrics display                    |
  | ViewingOverTime     | proto3 area-interactive | Use    | Main chart with toggles                |
  | GenreDistribution   | proto3 pie              | Use    | Genre breakdown                        |
  | ReleaseYearAnalysis | proto3 bar-interactive  | Use    | Decade/year grouping                   |
  | SeasonalPatterns    | proto3 radar-legend     | Use    | Month-over-month by year               |
  | TopDirectors        | proto3 radial-text      | Use    | Director frequency                     |
  | RatingDistribution  | New                     | Build  | How user rates movies                  |

  ---
  V. DATA FLOW & STATE MANAGEMENT

  Landing Page (/)
    ├─ Upload files (watched.csv, ratings.csv, diary.csv)
    ├─ Validate by filename
    ├─ Store in session/state (optional: localStorage)
    ├─ Show progress for each file
    └─ Button: "Continue to Dashboard" → /dashboard

  Dashboard (/dashboard)
    ├─ Retrieve uploaded files from state
    ├─ Parse CSVs:
    │  ├─ watched.csv: Extract all movies, dates, ratings
    │  ├─ ratings.csv: (optional) Additional rating data
    │  └─ diary.csv: (optional) Detailed watching history
    ├─ Compute analytics:
    │  ├─ Total movies, average rating, total hours
    │  ├─ Watching trends (time-series)
    │  ├─ Genre distribution
    │  ├─ Release year/decade preferences
    │  ├─ Seasonal patterns
    │  ├─ Top directors
    │  └─ Rating distribution
    ├─ Display in charts
    └─ Allow sidebar navigation to sub-views

  ---
  VI. IMPORTANT TECHNICAL DECISIONS

  1. State Management:
  - Use Zustand (already in package.json) for cross-page file state
  - Store uploaded file data in state (NOT localStorage initially, privacy concern)
  - Clear state on page refresh (user can re-upload)

  2. CSV Parsing on Frontend:
  - Use papaparse library (lightweight CSV parser)
  - Parse on client to compute analytics
  - OR send raw files to backend for processing
  - Recommendation: Hybrid approach:
    - Frontend: Quick validation & preview
    - Backend: Deep processing & TMDB enrichment

  3. Anonymous Session Handling:
  - Generate session ID on first upload (UUID)
  - Store files/analytics in memory during session
  - No persistence across browser refresh (unless localStorage)

  4. Responsive Design:
  - Desktop-first dashboard (sidebar + main content)
  - Mobile: Sidebar collapses to hamburger menu
  - Use prototype2's sidebar collapse behavior

  ---
  VII. IMMEDIATE ACTION ITEMS

  Phase 1 - Foundation (Priority order):
  1. ✅ Install dependencies: papaparse, framer-motion (for animations)
  2. Create Landing Page structure (hero + about + steps + upload)
  3. Build MultiFileUpload hook for state management
  4. Create UploadModal component with file type recognition
  5. Wire navigation to /dashboard

  Phase 2 - Dashboard (Can start in parallel):
  1. Build DashboardLayout (sidebar + main area)
  2. Implement StatsCard component
  3. Add chart components (adapt prototypes)
  4. Create analytics computation logic
  5. Wire sidebar navigation

  Phase 3 - Polish:
  1. Error handling & validation
  2. Loading states
  3. Empty states (no files uploaded)
  4. Responsive testing
  5. Accessibility (a11y)

  ---
  MISSING DETAILS IN YOUR PLAN

  You should clarify:

  1. Progress Steps Section - What exactly should be shown?
    - Simple 3-step timeline?
    - Expandable instructions?
    - Links to Letterboxd export docs?
  2. Analytics Computations - Which metrics are MUST-HAVE for MVP?
    - Total movies + average rating?
    - Full time-series analysis?
    - Director/genre breakdowns?
  3. Error States - What if:
    - User uploads wrong file format?
    - CSV missing required columns?
    - Files are corrupted/incomplete?
  4. Mobile Experience - Is mobile dashboard a priority, or desktop-first?
  5. Data Persistence - After we add auth (future), do you want:
    - File uploads stored on server?
    - Computed analytics cached?
    - Previous uploads retrievable?

  ---
  Let me know your thoughts on these suggestions and missing details, and I can help you start implementation! 