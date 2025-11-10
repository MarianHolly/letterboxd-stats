# Next Steps - Frontend Implementation Roadmap

## Phase 1: Chart Implementation ✏️ (READY TO START)

### 1.1 Viewing Over Time Chart
**File**: `components/dashboard/charts/viewing-over-time.tsx`
**Based on**: prototype3 `chart-area-interactive.tsx`
**Features**:
- Area/Line chart showing movie count over time
- Toggles:
  - Time granularity: Yearly / Monthly / Weekly
  - Time range: All Time / Last 3 Years / Last 12 Months
- Data source: `moviesPerMonth` from `useAnalytics`
- Recharts components: `AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`

### 1.2 Rating Distribution Chart
**File**: `components/dashboard/charts/rating-distribution.tsx`
**New component**
**Features**:
- Bar chart showing distribution of ratings (1-5 stars)
- Count of movies per rating
- Data source: `ratingDistribution` from `useAnalytics`
- Recharts components: `BarChart`, `Bar`, `XAxis`, `YAxis`

### 1.3 Genre Distribution Chart
**File**: `components/dashboard/charts/genre-distribution.tsx`
**Based on**: prototype3 `chart-pie-interactive.tsx`
**Features**:
- Pie chart showing genre breakdown
- Top 5-8 genres by movie count
- Data source: `genreDistribution` from `useAnalytics`
- Recharts components: `PieChart`, `Pie`, `Legend`, `Tooltip`

### 1.4 Release Year/Decade Analysis
**File**: `components/dashboard/charts/release-year-analysis.tsx`
**Based on**: prototype3 `chart-bar-interactive.tsx`
**Features**:
- Bar chart grouped by decade
- Alternative view by individual years
- Data source: `yearsWatched` from `useAnalytics`
- Interactive filtering by decade

---

## Phase 2: Additional Dashboard Pages

### 2.1 Viewing Patterns Page
**Route**: `/dashboard/patterns`
**File**: `app/dashboard/patterns/page.tsx`
**Content**:
- Detailed viewing over time chart (all toggles)
- Seasonal patterns radar (months across years)
- Day of week heatmap (if diary.csv available)
- Top watch dates list
- Viewing streaks analysis

### 2.2 Genres & Directors Page
**Route**: `/dashboard/genres`
**File**: `app/dashboard/genres/page.tsx`
**Content**:
- Genre distribution pie chart
- Top directors analysis (from TMDB enrichment)
- Genre x Director cross-analysis
- Searchable genre/director list

---

## Phase 3: Enhanced Features

### 3.1 Data Upload Enhancement
**Route**: `/dashboard/upload`
**Features**:
- Support for ratings.csv and diary.csv merge
- Data preview before confirmation
- File validation with detailed errors
- Progress tracking for large files

### 3.2 Settings Page
**Route**: `/dashboard/settings`
**File**: `app/dashboard/settings/page.tsx`
**Features**:
- Theme preferences (already have dark mode)
- Data management (clear, export, etc.)
- Analytics customization options

### 3.3 Export Functionality
- Export analytics as PDF
- Export raw data as CSV
- Share analytics summary

---

## Phase 4: Backend Integration (Planned)

### 4.1 Multiple File Processing
Update backend `/upload` endpoint to accept multiple files:
```python
# Currently: single file upload
# Future: watched.csv + ratings.csv + diary.csv
```

### 4.2 Data Enrichment
- Merge ratings.csv with watched.csv
- Merge diary.csv for detailed viewing history
- TMDB API integration for director/cast data

### 4.3 Computed Fields
Backend should compute and return:
- Aggregated metrics
- Genre breakdown
- Time-series data
- Director statistics

---

## Phase 5: User Accounts & Persistence

### 5.1 Authentication
- User registration/login
- JWT-based sessions
- Protected routes

### 5.2 Data Persistence
- Save user analytics to PostgreSQL
- Support multiple uploads per user
- Historical data tracking

### 5.3 Features Unlocked
- Cross-session data access
- Compare viewing habits over time
- Share analytics with others

---

## Implementation Order Recommendation

**Week 1-2**: Chart Implementation (Phase 1)
- Implement all 4 chart types
- Wire into dashboard overview page
- Test with sample CSV data

**Week 2-3**: Additional Pages (Phase 2)
- Build Viewing Patterns page
- Build Genres & Directors page
- Add sidebar navigation links

**Week 3-4**: Polish & Enhancements (Phase 3)
- Upload page refinement
- Settings page
- Export functionality

**Week 4+**: Backend Integration & Auth (Phase 4-5)
- Coordinate with backend on multi-file upload
- Implement user authentication
- Data persistence

---

## Sample CSV Data for Testing

Create a test file `test-data.csv`:
```csv
Name,Watched Date,Rating,Genres
The Matrix,2023-01-15,5,Action|Sci-Fi|Thriller
Inception,2023-02-12,4.5,Action|Sci-Fi|Thriller
The Dark Knight,2023-03-10,5,Action|Crime|Drama
Pulp Fiction,2023-04-05,4,Crime|Drama
Forrest Gump,2023-04-20,4,Drama|Romance
The Shawshank Redemption,2023-05-01,5,Drama
The Godfather,2023-05-15,5,Crime|Drama
Interstellar,2023-06-12,4.5,Adventure|Drama|Sci-Fi
The Avengers,2023-07-01,4,Action|Adventure|Sci-Fi
Titanic,2023-07-20,3.5,Drama|Romance
```

---

## Code Snippets for Quick Reference

### Adding a New Chart to Dashboard
```tsx
import { ChartComponent } from "@/components/dashboard/charts/chart-name";
import { useAnalytics } from "@/hooks/use-analytics";

export default function DashboardPage() {
  const analytics = useAnalytics(watchedData);

  return (
    <DashboardSection title="Chart Title">
      <ChartComponent data={analytics.metricName} />
    </DashboardSection>
  );
}
```

### Creating a New Page
```tsx
// app/dashboard/new-page/page.tsx
"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function NewPage() {
  return (
    <DashboardLayout>
      <DashboardHeader title="Page Title" description="Description" />
      {/* Content here */}
    </DashboardLayout>
  );
}
```

---

## Current Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| Landing Page | ✅ Complete | Hero, About, Steps, Upload Modal |
| Dashboard Layout | ✅ Complete | Sidebar, Header, Sections |
| Stats Cards | ✅ Complete | Displays metrics from analytics |
| Analytics Hook | ✅ Complete | Computes all metrics from CSV |
| Charts | ⏳ Placeholder | Ready for implementation |
| Additional Pages | ⏳ Not started | Sidebar nav ready |
| Settings Page | ⏳ Not started | Route defined |
| Authentication | ⏳ Not started | Planned for Phase 5 |
| Backend Integration | ⏳ Not started | Planned for Phase 4 |

---

## Notes & Considerations

1. **CSV Column Mapping**: Currently assumes exact column names (Name, Watched Date, Rating, Genres). Consider flexible mapping for user uploads.

2. **Performance**: CSV parsing on client-side is fast for typical exports (~100-1000 movies). For larger datasets, consider backend processing.

3. **Data Persistence**: Currently using in-memory state. Consider localStorage for temporary persistence during session.

4. **Error Handling**: Add better error messages for CSV parsing failures and invalid data.

5. **Testing**: Create comprehensive test suite for analytics computation and chart rendering.

---

## Questions for Planning Session

1. **Chart Priority**: Which charts are most important for MVP? All 4 or subset?
2. **Backend Sync**: When do we integrate with backend for data enrichment?
3. **User Accounts**: Required for MVP or post-launch feature?
4. **Mobile**: Is mobile dashboard a priority?
5. **Data Export**: PDF export required or optional?

---

## Useful Resources

- **Recharts Docs**: https://recharts.org/
- **Framer Motion**: https://www.framer.com/motion/
- **Tailwind CSS**: https://tailwindcss.com/
- **Prototype Components**: `.prototype1`, `.prototype2`, `.prototype3`, `.prototype4` folders
