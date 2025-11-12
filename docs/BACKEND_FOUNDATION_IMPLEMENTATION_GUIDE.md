# Backend Foundation - Detailed Implementation Guide

## 📖 Purpose of This Document

This guide explains the **why** and **how** of each backend component. Use it alongside Claude Code to understand the problems you're solving, the approaches you're taking, and how components work together.

**No code blocks included** - focus on understanding logic, then implement with Claude Code.

---

## 🎯 Overall Problem Statement

**Current situation:** Frontend processes CSVs client-side, stores in Zustand, loses data on refresh.

**Target situation:** Backend processes uploads, stores in PostgreSQL with session-based access, enables TMDB enrichment and shareable links.

**Key challenges:**
1. Parsing three different CSV formats with varying columns
2. Merging data from multiple files into single movie records
3. Storing efficiently for fast retrieval
4. Managing session lifecycle (creation, expiry, cleanup)
5. Providing status updates during processing

---

## 🗄️ Task 1: Database Models & Migrations

### Problem: How do we structure data storage?

**Core requirements:**
- Store session metadata (who, when, status)
- Store movie records (parsed CSV data + future TMDB fields)
- Link movies to sessions (one-to-many relationship)
- Auto-expire old sessions (30 days)
- Support future TMDB enrichment (nullable columns)

### Solution Approach: Two-Table Design

**Sessions table:**
- Primary key: UUID (not sequential, unguessable)
- Timestamps: created_at, expires_at, last_accessed
- Status tracking: processing, enriching, completed, failed
- Quick stats: total_movies (denormalized for speed)
- Metadata: JSON blob for file info

**Movies table:**
- Primary key: Auto-incrementing integer
- Foreign key: session_id (references sessions)
- CSV fields: title, year, rating, watched_date, letterboxd_uri
- TMDB fields: NULL initially, filled during enrichment
- JSONB columns: genres[], directors[], cast[] (flexible arrays)

### Internal Logic: Why This Structure?

**Session-centric design:**
- Every query starts with session_id
- Easy to find all movies for a session
- Cascade delete: removing session removes all movies
- No orphaned data

**Denormalization trade-off:**
- Store total_movies in sessions table
- Avoid COUNT(*) queries for every status check
- Update on insert (small write cost, big read benefit)

**JSONB for arrays:**
- Genres/directors/cast vary per movie
- No separate junction tables needed
- Can query: "movies with genre Drama"
- PostgreSQL GIN indexes make this fast

### Database Connection Strategy

**Connection pooling:**
- SQLAlchemy manages pool of connections
- Default: 5 connections (enough for FastAPI)
- Connections reused across requests
- Auto-reconnect on connection loss

**Session management:**
- Each request gets database session via dependency injection
- Session commits on success, rolls back on error
- Always closes in finally block (no leaks)

### Migration Strategy

**Alembic for schema versioning:**
- Initial migration creates both tables
- Future migrations add TMDB columns
- Can upgrade/downgrade database
- Production databases stay in sync

**Why migrations matter:**
- Development → Production consistency
- Easy rollback if issues
- Documents schema changes over time

---

## 📄 Task 2: CSV Parser Service

### Problem: How do we parse three different CSV formats?

**Letterboxd exports three files:**
1. **watched.csv** - Basic viewing history (Name, Year, Letterboxd URI, Date)
2. **ratings.csv** - Your ratings (Name, Year, Rating)
3. **diary.csv** - Detailed entries (Name, Year, Rating, Date, Rewatch, Tags, Review)

**Challenges:**
- Different column names across files
- Date formats vary (ISO, US format, etc.)
- Ratings use half-stars (0.5, 1.0, 1.5, ..., 5.0)
- Some fields optional (user might not rate everything)
- Need to merge into single canonical record

### Solution Approach: Three Parsers + Merge Logic

**Parser architecture:**
- One class: LetterboxdParser
- Three methods: parse_watched(), parse_ratings(), parse_diary()
- Each returns list of dictionaries (normalized format)
- Merge method combines lists intelligently

**Normalized movie dictionary:**
Every parser outputs same structure:
- title: string (required)
- year: integer or None
- rating: float or None (0.5 to 5.0)
- watched_date: date object or None
- letterboxd_uri: string (unique identifier)
- rewatch: boolean (default false)
- tags: list of strings
- review: string or None

### Internal Logic: Parsing Strategy

**Step 1: Read CSV with pandas**
- Use pandas for robust CSV parsing
- Handles quotes, commas in titles, encoding issues
- Returns DataFrame (table-like structure)

**Step 2: Validate required columns**
- Check "Name" column exists (every file has this)
- Check "Letterboxd URI" exists (unique ID)
- Raise error if missing critical columns
- Warn about missing optional columns

**Step 3: Transform to dictionaries**
- Iterate DataFrame rows
- Extract and clean each field
- Handle missing values (None vs empty string)
- Parse dates with multiple format attempts
- Normalize ratings (ensure 0.5 increments)

**Step 4: Return list**
- Each dict represents one movie
- Ready for merge logic

### Merge Logic: Handling Conflicts

**Priority order: diary > ratings > watched**

**Why this order?**
- Diary has most detail (rating + date + review)
- Ratings has rating but no date
- Watched has date but might not have rating

**Merge algorithm:**
1. Create dictionary keyed by letterboxd_uri
2. Process watched.csv first (base records)
3. Process ratings.csv, update if rating present
4. Process diary.csv last, overwrites everything

**Conflict resolution:**
- If same movie in multiple files, diary wins
- If movie only in diary, that's the record
- If movie only in watched, that's the record
- Handles user rating later than watching

**Edge cases:**
- Movie in ratings but not watched → create record
- Duplicate entries in same file → keep first
- Invalid dates → set to None
- Invalid ratings → set to None

### Date Parsing Strategy

**Multiple format attempts:**
1. Try ISO format: 2024-01-15
2. Try US format: 01/15/2024
3. Try European format: 15/01/2024
4. Try text month: Jan 15, 2024

**Why multiple attempts?**
- Letterboxd formats changed over time
- User locale affects exports
- Better to parse than fail

### Rating Normalization

**Input formats:**
- Stars: 1, 2, 3, 4, 5
- Half stars: 0.5, 1.5, 2.5, 3.5, 4.5
- Text: "★★★★½"

**Normalization:**
- Convert all to float (0.5 to 5.0)
- Round to nearest 0.5
- Validate range (discard if out of bounds)

---

## 💾 Task 3: Storage Service

### Problem: How do we efficiently store parsed data?

**Requirements:**
- Store hundreds/thousands of movies quickly
- Update session metadata atomically
- Handle database errors gracefully
- Provide query methods for retrieval

### Solution Approach: Service Layer Pattern

**Why a separate service?**
- Separates database logic from API logic
- Reusable across multiple endpoints
- Easier to test in isolation
- Can swap implementations (e.g., add caching)

**Service class structure:**
- Takes database session as constructor parameter
- Methods for CRUD operations
- Transaction management (commit/rollback)
- Error handling with meaningful messages

### Internal Logic: Bulk Insert Strategy

**Naive approach (slow):**
- Loop through movies
- Insert one by one
- Commit after each
- Result: 1000 movies = 1000 database round-trips

**Optimized approach (fast):**
- Create all movie objects in memory
- Use SQLAlchemy bulk_save_objects()
- Single commit at end
- Result: 1000 movies = 1 database round-trip

**Why bulk operations matter:**
- 10x-100x faster for large uploads
- Reduces database load
- Better user experience (faster uploads)

### Transaction Management

**Atomic operations:**
- Session creation + movie storage happens together
- Either both succeed or both fail (rollback)
- No partial data in database

**Error scenarios:**
1. Database connection lost → Rollback, raise error
2. Constraint violation → Rollback, raise error
3. Disk full → Rollback, raise error

**Recovery:**
- API returns error to frontend
- Frontend shows meaningful message
- User can retry upload
- No corrupt data left in database

### Query Methods

**get_session(session_id):**
- Find by UUID
- Return None if not found (don't raise)
- Optionally include movies (lazy vs eager loading)

**get_movies(session_id):**
- Return all movies for session
- Ordered by watched_date descending (recent first)
- Pagination support (limit/offset)

**update_session_status(session_id, status):**
- Atomic status update
- Timestamp last_accessed
- Used by background tasks

### Lazy vs Eager Loading

**Lazy loading (default):**
- Get session, movies not loaded yet
- Query movies separately when needed
- Good for status checks (don't need movie data)

**Eager loading (optional):**
- Get session WITH movies in one query
- Use SQLAlchemy joinedload()
- Good for full session display

---

## 🌐 Task 4: Upload API Endpoint

### Problem: How do we handle file uploads in FastAPI?

**Requirements:**
- Accept multipart/form-data (file uploads)
- Support multiple files simultaneously
- Validate file types and sizes
- Parse and store efficiently
- Return session_id immediately

### Solution Approach: Async Upload Handler

**Endpoint design:**
- POST /api/upload
- Accepts: List of UploadFile objects
- Returns: JSON with session_id and status

**Why async?**
- Doesn't block server during file processing
- Can handle multiple uploads concurrently
- FastAPI async support is excellent

### Internal Logic: Upload Processing Flow

**Phase 1: Validation (fail fast)**
1. Check at least one file provided
2. Verify file extensions (.csv or .zip)
3. Check file size (reject > 50MB)
4. Read file content (in memory for small files)

**Phase 2: Session Creation**
1. Generate UUID (cryptographically secure)
2. Create session record in database
3. Set status = 'processing'
4. Commit immediately (session exists before processing)

**Phase 3: File Processing**
1. Identify file type by name (watched, ratings, diary)
2. Pass to CSV parser
3. Collect parsed data from all files
4. Merge if multiple files

**Phase 4: Storage**
1. Bulk insert movies via StorageService
2. Count total movies
3. Update session with total_movies
4. Set status = 'enriching' (ready for TMDB Phase 2)

**Phase 5: Response**
1. Return session_id to frontend
2. Include status and movie count
3. Frontend can now poll status endpoint

### File Type Detection

**Strategy:**
- Check filename contains 'watched', 'ratings', or 'diary'
- Case-insensitive matching
- Default to 'watched' if ambiguous

**Why filename-based?**
- Letterboxd exports have standard names
- Content-based detection too complex
- User can rename but usually doesn't

### Error Handling Strategy

**Validation errors (HTTP 400):**
- No files provided
- Invalid file format
- File too large
- Missing required columns

**Processing errors (HTTP 422):**
- CSV parse failed
- Date parsing failed
- Invalid data format

**Server errors (HTTP 500):**
- Database connection failed
- Disk write failed
- Unexpected exceptions

**Error response format:**
- JSON with detail message
- Includes which file caused error
- Suggests resolution steps

### Multiple File Support

**Handling combinations:**
- Just watched.csv → OK
- Just diary.csv → OK (has all data)
- watched.csv + ratings.csv → Merge
- All three → Merge with diary priority

**Validation:**
- Must provide at least one file
- Can't provide non-Letterboxd files
- ZIP files auto-extracted

---

## 🔍 Task 5: Session Management Endpoints

### Problem: How does frontend track processing?

**Requirements:**
- Check if session exists
- Get current processing status
- Retrieve movie list when ready
- Handle invalid session IDs gracefully

### Solution Approach: Status Polling Architecture

**Endpoint 1: GET /api/session/{session_id}/status**

**Purpose:** Lightweight status check for frontend polling

**Returns:**
- session_id (echo back)
- status (processing, enriching, completed, failed)
- total_movies (if known)
- enriched_count (if enriching)
- error_message (if failed)
- created_at, expires_at

**Why this structure?**
- Frontend polls every 2 seconds during enrichment
- Minimal data transfer (just status)
- Doesn't load full movie list (expensive)

**Endpoint 2: GET /api/session/{session_id}/movies**

**Purpose:** Retrieve all movies when ready

**Returns:**
- List of movie objects with all fields
- Pagination support (page, per_page params)
- Total count for pagination UI

**Why separate endpoint?**
- Movies can be 1000+ records (large payload)
- Only fetch when user needs it
- Supports pagination for large datasets

**Endpoint 3: GET /api/session/{session_id}**

**Purpose:** Full session details (metadata + quick stats)

**Returns:**
- Session metadata
- Quick statistics (no movies list)
- Processing history

### Internal Logic: Status Transitions

**State machine:**
```
uploading → processing → enriching → completed
                ↓
              failed
```

**State meanings:**
- **uploading:** Files being received (brief)
- **processing:** CSV parsing in progress
- **enriching:** TMDB metadata being fetched (Phase 2)
- **completed:** All done, ready to view
- **failed:** Error occurred, see error_message

### Polling Strategy (Frontend)

**During enrichment:**
- Poll every 2 seconds
- Show progress bar (enriched_count / total_movies)
- Update UI incrementally

**After completion:**
- Stop polling
- Fetch full movie list
- Redirect to /stats/{session_id}

**Error handling:**
- If 404: Session expired or invalid
- If failed status: Show error message
- Offer to upload again

### Session Expiry Logic

**When session accessed:**
- Update last_accessed timestamp
- Reset expiry timer (30 days from now)

**Background cleanup:**
- Daily cron job finds expired sessions
- Deletes via cascade (removes movies too)
- Keeps database clean

**Why 30 days?**
- Long enough for user to share link
- Short enough to manage storage
- Aligns with industry standards

---

## 🔄 Data Flow Integration

### Upload to Database Flow

**Step-by-step:**
1. User clicks upload in frontend
2. Frontend POST to /api/upload with files
3. Backend validates files
4. Backend generates UUID session
5. Backend stores session (status=processing)
6. Backend parses CSV files
7. Backend merges data
8. Backend stores movies
9. Backend updates session (status=enriching, total_movies=N)
10. Backend returns session_id
11. Frontend redirects to /stats/{session_id}
12. Frontend polls /api/session/{id}/status
13. Shows "Processing..." → "Enriching..." → "Completed"

### Error Recovery Flow

**If parsing fails:**
1. Rollback database transaction
2. Mark session as failed
3. Store error message
4. Return 422 to frontend
5. Frontend shows error + retry button

**If database fails:**
1. Log error server-side
2. Return 500 to frontend
3. Frontend shows generic error
4. User can retry upload

---

## 🧪 Testing Strategy

### Unit Tests (pytest)

**CSV Parser tests:**
- Parse valid watched.csv
- Parse valid ratings.csv
- Parse valid diary.csv
- Handle missing columns
- Handle malformed dates
- Handle invalid ratings
- Merge logic correctness

**Storage Service tests:**
- Insert movies
- Retrieve by session_id
- Update session status
- Handle database errors
- Transaction rollback

### Integration Tests

**Upload endpoint:**
- Upload single file
- Upload multiple files
- Invalid file type
- File too large
- Missing columns
- Successful end-to-end

**Session endpoints:**
- Get valid session
- Get invalid session (404)
- Check status polling
- Retrieve movies

### Manual Testing Checklist

- [ ] Upload your actual Letterboxd CSV (1600 movies)
- [ ] Verify all movies in database
- [ ] Check ratings preserved
- [ ] Check dates parsed correctly
- [ ] Test with only watched.csv
- [ ] Test with all three files
- [ ] Verify merge priority (diary wins)
- [ ] Check session expiry

---

## 🔌 Integration Points for Phase 2

**TMDB Enrichment connection:**
- After storing movies, status = 'enriching'
- Background task loops through movies
- For each: call TMDB API, update record
- Update enriched_count after each
- When done: status = 'completed'

**Frontend polling uses same endpoint:**
- No changes needed to status endpoint
- Already tracks enriched_count
- Frontend just polls longer during enrichment

**Database ready for TMDB data:**
- JSONB columns for genres, directors, cast
- Nullable columns for runtime, budget, etc.
- Boolean flag: tmdb_enriched

---

## 🎯 Success Criteria

**You know Phase 1 is done when:**
- [ ] Can upload watched.csv via API
- [ ] Session created in PostgreSQL
- [ ] Movies stored correctly
- [ ] Can check session status
- [ ] Can retrieve movie list
- [ ] Handles 1000+ movies in < 2 seconds
- [ ] Proper error messages on failures
- [ ] Database doesn't leak connections
- [ ] Can test with curl/Postman
- [ ] Ready for Phase 2 (TMDB integration)

---

## 📋 Development Workflow with Claude Code

**Recommended order:**
1. Start with database models (foundational)
2. Then CSV parser (can test independently)
3. Then storage service (uses models)
4. Then upload endpoint (uses parser + storage)
5. Finally session endpoints (uses storage)

**Iterative approach:**
- Build one component at a time
- Test before moving to next
- Keep commits small and focused
- Document decisions in comments

**Working with Claude Code:**
- Share this guide as context
- Ask clarifying questions before coding
- Test each component thoroughly
- Request code review before proceeding

---

**Ready to implement?** Start with Task 1 (Database Models) and work through each task using Claude Code.
