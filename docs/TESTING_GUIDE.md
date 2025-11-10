# Testing Guide - Frontend Flow

## 🎯 Test Flow: Landing Page → Dashboard

### Prerequisites
1. Run dev server: `npm run dev`
2. Open browser: `http://localhost:3000`

---

## 📋 Test Case 1: Full Upload Flow

### Step 1: Landing Page Loads ✅
**Expected:**
- Hero section visible with animated background shapes
- "Start Analyzing" and "Learn More" buttons visible
- Smooth animations on page load
- About section with 4 feature cards (Free, Rich Data, Privacy, Insights)
- Steps section showing 3-step process (Export, Upload, Explore)

### Step 2: Click "Start Analyzing" Button ✅
**Expected:**
- Upload modal opens
- Modal shows:
  - Title: "Upload Your Letterboxd Data"
  - Dropzone with upload icon
  - File requirements section with 3 cards:
    - Watched Movies (Required - shown in red border)
    - Ratings (Optional - shown in gray border)
    - Diary (Optional - shown in gray border)
  - "Continue to Dashboard" button (disabled)

### Step 3: Create Test CSV File 📝
Create a file named `test-watched.csv`:
```csv
Name,Watched Date,Rating,Genres
The Matrix,2024-01-15,5,Action|Sci-Fi
Inception,2024-01-12,4.5,Sci-Fi|Drama
The Dark Knight,2024-01-10,5,Action|Crime|Drama
Pulp Fiction,2024-01-05,4,Crime|Drama
Forrest Gump,2023-12-20,4,Drama|Romance
The Shawshank Redemption,2023-12-15,5,Drama
The Godfather,2023-11-10,5,Crime|Drama
Interstellar,2023-10-30,4.5,Sci-Fi|Drama
The Avengers,2023-10-01,4,Action|Sci-Fi
Titanic,2023-09-15,3.5,Drama|Romance
```

### Step 4: Upload File ✅
**Action:** Drag and drop `test-watched.csv` into the dropzone (or click to browse)

**Expected:**
- File appears in the modal with:
  - File name: `test-watched.csv`
  - File size: ~1-2 KB
  - Type badge: "watched"
  - Green checkmark icon (success status)
- "Watched Movies" card shows green border (file uploaded)
- "Continue to Dashboard" button becomes enabled

### Step 5: Click "Continue to Dashboard" ✅
**Expected:**
- Modal closes
- Page navigates to `/dashboard`
- Loading skeleton displays briefly (shimmer animation)

---

## 📊 Test Case 2: Dashboard with Data

### Step 1: Dashboard Loads ✅
**Expected:**
- Sidebar visible on desktop (hamburger menu on mobile)
- Dashboard header shows:
  - Title: "Your Letterboxd Analytics"
  - Description: "Insights into your movie-watching journey"
  - "Upload New Data" button
  - Last updated timestamp
- Page displays content with smooth animations

### Step 2: Verify Key Metrics ✅
**Expected:** 4 stat cards display:
1. **Total Movies**: 10 (count of movies in CSV)
2. **Average Rating**: 4.3★ (mean of all ratings)
3. **Total Hours**: 0 (no runtime column in test data)
4. **Tracking Period**: ~116d (days from first to last movie)

**Stat Cards Features:**
- Animated entrance with stagger delay
- Hover effects with gradient overlay
- Icons for each metric
- Description text below value

### Step 3: Verify Sections ✅
**Expected:**

#### Viewing Overview Section
- Title: "Viewing Overview"
- Two placeholder boxes:
  - "Viewing Over Time Chart Coming Soon"
  - "Rating Distribution Chart Coming Soon"
- Grey background with border

#### Genres & Years Section
- Title: "Genres & Years"
- Two placeholder boxes:
  - "Genre Distribution Coming Soon"
  - "Release Year Analysis Coming Soon"

#### Data Summary Section
- Title: "Data Summary"
- Shows uploaded file:
  - File name: `test-watched.csv`
  - File size: (file size in KB)
  - Type badge: "watched"
  - Upload date: (today's date)

---

## 📱 Test Case 3: Empty Dashboard (No Files)

### Step 1: Navigate to `/dashboard` without uploading ✅
**Actions:**
1. Open new tab
2. Type: `http://localhost:3000/dashboard`
3. Press Enter

**Expected:**
- Loading skeleton displays for 1-2 seconds
- EmptyState page displays:
  - Upload icon in animated circle
  - Title: "No Data Uploaded Yet"
  - Description text
  - 3 instructional steps:
    1. Export Your Data (with explanation)
    2. Upload Here (with explanation)
    3. View Analytics (with explanation)
  - "Upload Your Data" button (with arrow icon)
  - Privacy message at bottom

### Step 2: Click "Upload Your Data" Button ✅
**Expected:**
- Upload modal opens
- User can upload files
- After upload, metrics compute and display

---

## 🔄 Test Case 4: Upload Additional Files

### Step 1: Click "Upload New Data" Button ✅
**Action:** On dashboard with data, click "Upload New Data" button in header

**Expected:**
- Upload modal opens
- Shows existing file and new files can be added

### Step 2: Upload Ratings File (Optional) ✅
Create `test-ratings.csv`:
```csv
Name,Rating,Rated Date
The Matrix,5,2024-01-16
Inception,4.5,2024-01-13
The Dark Knight,5,2024-01-11
```

**Expected:**
- File appears in modal
- Type badge shows "ratings"
- "Ratings" card shows green border
- Dashboard updates without page reload

---

## 📱 Test Case 5: Mobile Responsiveness

### Step 1: Test on Mobile Device ✅
**Actions:**
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test various screen sizes

**Expected Results:**

**Mobile (iPhone 12):**
- Hamburger menu visible (top-left)
- Sidebar hidden by default
- Click hamburger → sidebar slides in from left
- Click overlay → sidebar closes
- Single-column layout for all content
- Stats cards in 1-column grid
- Sections stack vertically

**Tablet (iPad):**
- Hamburger menu still visible
- 2-column grid for stat cards
- 2-column grid for chart sections

**Desktop (1920x1080):**
- Sidebar always visible
- 4-column grid for stat cards
- 2-column grid for chart sections

---

## ❌ Test Case 6: Error Handling

### Step 1: Upload Invalid File ✅
**Action:** Try to upload a `.txt` file instead of `.csv`

**Expected:**
- Modal shows error message
- File type appears with red error icon
- Error message: `File must be .csv format`
- "Continue to Dashboard" button disabled

### Step 2: Upload Wrong CSV File ✅
Create `wrong-format.csv`:
```csv
Title,Year
The Matrix,1999
```

**Action:** Upload this file as watched.csv

**Expected:**
- File uploads but validation fails
- Error message indicates missing required columns
- Button remains disabled until corrected

### Step 3: Upload with No Required File ✅
**Action:** Upload only `ratings.csv` (no watched.csv)

**Expected:**
- Warning: "Watched Movies is required"
- "Continue to Dashboard" button disabled

---

## 🎨 Test Case 7: Visual Polish

### Step 1: Animations ✅
**Expected:**
- Hero shapes animate up smoothly on page load
- Text fades in with slight upward motion
- Stats cards stagger in sequence
- Sections fade in with delay
- Hover effects on buttons (shadow, scale)
- Sidebar slides on mobile

### Step 2: Dark Theme ✅
**Expected:**
- Background is dark slate gradient
- Text is white with proper contrast
- Accent colors: indigo (primary), rose (secondary)
- Borders are subtle white/10 opacity
- Hover states brighten borders to white/20

### Step 3: Responsive Typography ✅
**Expected:**
- Text scales appropriately on mobile
- Headings readable at all sizes
- No text overflow
- Proper line heights for readability

---

## 🧪 Test Case 8: State Management

### Step 1: Verify Zustand Store ✅
**Actions:**
1. Open DevTools Console
2. Upload file
3. Check localStorage (or in-memory state)

**Expected:**
- Files stored in Zustand state
- Session ID generated
- File data persists across component remounts

### Step 2: Test Analytics Hook ✅
**Actions:**
1. Upload CSV with metrics
2. Inspect computed analytics

**Expected:**
- `totalMovies`: Correct count
- `averageRating`: Correct mean
- `totalDaysTracking`: Correct date range
- `moviesPerMonth`: Correct distribution
- `genreDistribution`: Parsed correctly

---

## 📊 Test Case 9: Real Letterboxd Data

### Step 1: Export from Letterboxd ✅
**Actions:**
1. Go to letterboxd.com
2. Log in to your account
3. Settings → Import & Export
4. Click "Export Your Data"
5. Download and extract ZIP

### Step 2: Upload to Application ✅
**Action:** Upload the actual `watched.csv` from Letterboxd

**Expected:**
- File uploads successfully
- Metrics compute correctly
- Dashboard shows real statistics
- Data appears accurate

---

## ✅ Checklist

Use this checklist to verify all functionality:

### Landing Page
- [ ] Hero section animates on load
- [ ] About section displays correctly
- [ ] Steps section shows process
- [ ] "Start Analyzing" button opens modal
- [ ] "Learn More" button works

### Upload Modal
- [ ] Modal opens/closes smoothly
- [ ] Drag-drop works
- [ ] File selection works
- [ ] File validation shows errors
- [ ] Required files indicated
- [ ] File list displays
- [ ] Remove file works
- [ ] Clear all works

### Dashboard
- [ ] Loads after upload
- [ ] Metrics compute correctly
- [ ] Sections display
- [ ] Charts placeholders show
- [ ] File summary shows
- [ ] Upload new data opens modal
- [ ] Last updated shows correct time

### Empty State
- [ ] Shows when no files uploaded
- [ ] Upload button works
- [ ] Instructions clear
- [ ] Animations smooth

### Mobile
- [ ] Hamburger menu works
- [ ] Sidebar collapse/expand works
- [ ] Responsive grid works
- [ ] Single column layout on mobile
- [ ] Text readable on small screens

### Error Handling
- [ ] Invalid file types rejected
- [ ] Missing required columns detected
- [ ] Error messages clear
- [ ] Graceful error recovery

---

## 🐛 Known Issues & Workarounds

### Issue: Zustand state not persisting
**Status:** Expected behavior (in-memory only)
**Workaround:** Data persists during session only. Page refresh clears data.

### Issue: Charts show "Coming Soon"
**Status:** Expected (chart implementation pending)
**Timeline:** Will be implemented in next phase

### Issue: No runtime data
**Status:** Test CSV doesn't include runtime column
**Workaround:** Use real Letterboxd data or add Runtime column to test CSV

---

## 🚀 Performance Testing

### Load Time ✅
- Landing page should load in <1s
- Dashboard should compute analytics <500ms
- Smooth 60 FPS animations

### Memory Usage ✅
- Loading skeleton should be lightweight
- CSV parsing should not cause lag
- No memory leaks on navigate

---

## 📝 Test Data Generator

For bulk testing, use this expanded CSV:

```csv
Name,Watched Date,Rating,Genres
Movie 1,2024-01-01,5,Action|Adventure
Movie 2,2024-01-05,4,Drama|Romance
Movie 3,2024-02-10,3.5,Comedy|Family
Movie 4,2024-03-15,4.5,Sci-Fi|Thriller
Movie 5,2024-04-20,5,Action|Crime
Movie 6,2024-05-25,3,Drama
Movie 7,2024-06-30,4,Comedy|Crime
Movie 8,2024-07-05,5,Action|Sci-Fi
Movie 9,2024-08-10,3.5,Drama|Romance
Movie 10,2024-09-15,4,Thriller|Mystery
```

---

## 🎓 Testing Tips

1. **Test in incognito mode** - Ensures clean state without localStorage
2. **Clear DevTools cache** - Forces fresh CSS/JS loads
3. **Test with slow 3G** - Check how loading states handle delays
4. **Resize window** - Test responsiveness at multiple breakpoints
5. **Test keyboard navigation** - Tab through buttons, Enter to select
6. **Test accessibility** - Use screen reader if available

---

## 📞 Support

If issues occur:
1. Check console for error messages
2. Verify CSV format is correct
3. Ensure backend is running (if needed)
4. Try fresh browser session
5. Check docs for detailed info
