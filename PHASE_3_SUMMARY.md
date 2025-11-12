# Phase 3 Plan Summary - Quick Reference

**Created**: November 12, 2025
**Your Preferences**:
- ✅ Goal: Show enrichment progress AND display enriched data
- ✅ Testing approach: Simple test page with formatted data display
- ✅ Important features: Genres, Directors, Runtime, (+ Country, Language added)
- ✅ Workflow: **Test First → Progress → Charts**

---

## What We're Building

### Phase 3A: Backend Extensions (1-2 hours)
Add two new fields to capture more TMDB data:

**Movie Model** - 2 new fields:
```python
original_language  # "en", "fr", "ja", etc.
country            # "United States", "Japan", etc.
```

**TMDB Client** - Extract these fields:
- Modify `extract_enrichment_data()` to include language & country
- Add `_extract_country()` helper method

**StorageService** - Save these fields:
- Update `update_movie_enrichment()` to set the new fields

---

### Phase 3B: Test Page (1-2 hours)
**Create `/test-enrichment` page to verify data quality BEFORE building UI:**

**Test Endpoints** (in `app/api/test.py`):
1. `GET /api/test/session/{id}/movies-summary`
   - Shows first 10 movies with all TMDB fields
   - Raw JSON display

2. `GET /api/test/session/{id}/enrichment-stats`
   - Counts: genres, directors, languages, countries
   - Averages: runtime, ratings
   - Shows examples

3. `GET /api/test/session/{id}/unenriched-movies`
   - Lists movies still waiting for enrichment
   - Useful for debugging

**Frontend Test Page** (at `/test-enrichment`):
- Input session ID
- Three buttons: Summary, Stats, Unenriched
- Display formatted JSON responses
- See what data you're getting

---

### Phase 3C: Progress Tracking (1-2 hours)
**Show enrichment progress in real-time:**

**Polling Hook** (`use-enrichment-status.ts`):
```typescript
const { status, isLoading, error } = useEnrichmentStatus(sessionId)
// status.enriched_count / status.total_movies
// status.progress_percent (0-100)
```

**Progress Bar Component** (`enrichment-progress.tsx`):
- Shows during enrichment: "45/100 movies enriched (45%)"
- Shows when complete: "✓ Enrichment Complete!"
- Calls `onComplete()` callback when done

---

### Phase 3D: Data Display Charts (2-3 hours)
**Build the charts after you verify the data quality:**

1. **Genre Distribution** (already exists, just connect to TMDB)
   - Use `genres` from TMDB instead of user input

2. **Director Rankings** (NEW)
   - Bar chart: Top 10 directors watched
   - X-axis: Director name, Y-axis: Number of movies

3. **Language/Country Distribution** (NEW)
   - Two side-by-side lists
   - Languages: "English", "Japanese", "French", etc.
   - Countries: "United States", "Japan", "France", etc.

4. **Runtime Statistics** (NEW)
   - Average runtime
   - Total hours watched

---

## Your Workflow: "Test First"

```
1. EXTEND BACKEND (Phase 3A)
   └─ Add country & language fields
   └─ Update TMDB client to extract them
   └─ Update storage to save them

2. TEST & VERIFY (Phase 3B) ← You start here
   └─ Create test page
   └─ Upload CSV
   └─ Wait for enrichment
   └─ Check test endpoints
   └─ Verify: are genres/directors/languages/countries populated?
   └─ Look at actual data before building UI

3. BUILD PROGRESS (Phase 3C)
   └─ Create polling hook
   └─ Show progress bar
   └─ Test with real enrichment

4. BUILD CHARTS (Phase 3D)
   └─ Genre chart (connect to TMDB)
   └─ Director chart
   └─ Language/country display
   └─ Runtime stats

5. INTEGRATE (Phase 3E)
   └─ Connect everything
   └─ Test end-to-end
   └─ Polish
```

---

## What Gets Built Where

### Backend Changes (3 files)
```
app/models/database.py
  └─ Add: original_language, country fields

app/services/tmdb_client.py
  └─ Modify: extract_enrichment_data()
  └─ Add: _extract_country() method

app/services/storage.py
  └─ Modify: update_movie_enrichment()

app/api/test.py (NEW)
  └─ Three test endpoints

app/main.py
  └─ Register test router
```

### Frontend Changes (5 files)
```
frontend/hooks/use-enrichment-status.ts (NEW)
  └─ Polling hook for progress

frontend/components/dashboard/enrichment-progress.tsx (NEW)
  └─ Progress bar component

frontend/components/dashboard/charts/director-rankings.tsx (NEW)
  └─ Director rankings chart

frontend/components/dashboard/charts/language-country-dist.tsx (NEW)
  └─ Language/country distribution

frontend/app/test-enrichment/page.tsx (NEW)
  └─ Test page for data verification
```

---

## Key Questions Answered

### "What data will I receive?"
**That's what Phase 3B answers!**
- Test page shows exactly what you get from API
- See real movies with all their TMDB fields
- Verify counts and data quality
- Then you know what to display

### "Is the data being saved correctly?"
**Test endpoints prove it:**
- Summary endpoint shows sample movies (check fields populated)
- Stats endpoint counts all values (check counts match expectation)
- Unenriched endpoint shows what's still missing

### "How do I display it?"
**Phase 3D builds the components:**
- Genre chart, Director chart, Language/country lists
- Runtime stats and averages
- All using the data from test page

---

## Testing Strategy

### Minimal Test (15 minutes)
1. Upload CSV with 5-10 movies
2. Wait 1-2 minutes for enrichment
3. Go to `/test-enrichment` page
4. Check: Summary shows enriched=true? Fields populated?
5. Check: Stats page shows genres, directors, countries?

### Full Test (30-45 minutes)
1. Upload CSV with 50+ movies
2. Monitor progress using `/worker/status`
3. Wait for enrichment complete
4. Test all three endpoints:
   - Summary: Look at sample movies
   - Stats: Verify counts are reasonable
   - Unenriched: Should be empty or show only failed movies
5. Record what you see

### Expected Results
```
Summary:
{
  "total_movies": 50,
  "enriched_count": 50,
  "movies_sample": [
    {
      "title": "The Matrix",
      "genres": ["Action", "Drama", "Science Fiction"],
      "directors": ["Lana Wachowski", "Lilly Wachowski"],
      "cast": ["Keanu Reeves", "Laurence Fishburne", ...],
      "runtime": 136,
      "original_language": "en",
      "country": "United States",
      "vote_average": 8.7
    },
    ...
  ]
}

Stats:
{
  "total_movies": 50,
  "enriched_count": 50,
  "enrichment_percentage": 100.0,
  "data_summary": {
    "unique_genres": { "count": 15, "examples": ["Action", "Drama", "Comedy", ...] },
    "unique_directors": { "count": 42, "examples": [...] },
    "unique_languages": { "count": 8, "examples": ["en", "ja", "fr", "ko", ...] },
    "unique_countries": { "count": 6, "examples": ["United States", "Japan", "France", ...] },
    "runtime": { "average": 115.3, "total_hours": 96.1 },
    "ratings": { "average": 7.8 }
  }
}
```

---

## Estimated Timeline

| Phase | Duration | What You Do |
|-------|----------|------------|
| 3A | 1-2 hrs | I make backend changes, you review |
| 3B | 1-2 hrs | You test with real data, tell me results |
| 3C | 1-2 hrs | I build progress, you verify it works |
| 3D | 2-3 hrs | I build charts, you verify display |
| 3E | 1-2 hrs | I integrate, you do final testing |
| **Total** | **7-11 hrs** | Depending on data quality |

---

## Ready to Start?

**Yes?** → Let's begin Phase 3A (Backend Extensions)

**Next steps:**
1. ✅ I update Movie model (add country & language)
2. ✅ I update TMDB client (extract these fields)
3. ✅ I update StorageService (save them)
4. ✅ I create test endpoints
5. ✅ I create test page
6. ✅ You test with real CSV → Report what you see
7. ✅ We continue to Phase 3C (Progress) → 3D (Charts) → 3E (Integration)

Sound good? Ready to start Phase 3A?
