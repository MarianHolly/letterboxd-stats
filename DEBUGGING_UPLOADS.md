# Debugging Upload Issues

## Issue: Upload Through Analytics Fails, But Dashboard Works

### Steps to Debug

#### 1. **Open Browser Console**
- Press `F12` or right-click → "Inspect" → "Console" tab
- Clear the console
- Perform the upload

#### 2. **Look for Analytics Upload Logs**
You should see these logs appear in order:

```
[Analytics Upload] Starting upload with files: [...]
[Analytics Upload] Valid files: [...]
[Analytics Upload] Sending to: http://localhost:8000/api/upload
[Analytics Upload] Response status: 200
[Analytics Upload] Session ID received: {session-id}
[Analytics Upload] Upload complete, closing modal
```

#### 3. **Identify Where It Fails**

**If you see "Starting upload with files:" but nothing after...**
- The upload handler was called
- Check if there are any JavaScript errors below the logs
- Look for CORS errors or network errors

**If you see "Valid files: []" (empty array)**
- Files are being passed but filtered out
- Check: Files must have `status: "success"` and `type !== "unknown"`
- Look at the file list in the modal before clicking upload

**If you see "Response status: 404" or higher error code**
- Request reached backend but failed
- Check backend logs for error details
- May be database or validation issue

**If you don't see any logs at all**
- Upload handler not being called
- UploadModal's `onUploadComplete` may not be wired correctly
- Check if Continue button is clickable and functional

---

### Dashboard vs Analytics Comparison

#### Dashboard Upload Handler
- Stores files locally to Zustand store **after** upload
- Uses `useEnrichedDataFromStore()` for data

#### Analytics Upload Handler
- Does NOT store files locally
- Uses `useEnrichedDataFromSession()` to fetch from backend

This difference could cause different behaviors if there are CORS issues or API path differences.

---

### Network Debugging

#### Check Network Tab
1. Open DevTools → Network tab
2. Clear all requests
3. Try uploading
4. Look for request to `/api/upload`

**Check the request:**
- Method: `POST`
- Headers: Should include `Content-Type: multipart/form-data`
- Body: Should show files being sent

**Check the response:**
- Status: Should be `201` (Created)
- Body: Should contain `session_id`

If the request appears but has no response, check:
- Backend is running
- API URL is correct (check `NEXT_PUBLIC_API_URL`)
- No CORS issues

---

### Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| **API URL Wrong** | Request goes to wrong domain | Check `.env.local` → `NEXT_PUBLIC_API_URL` |
| **Backend Down** | No response / timeout | `python -m uvicorn main:app --reload` in backend |
| **CORS Error** | Console error about CORS | Backend CORS middleware may need update |
| **File Not Selected** | Valid files array empty | Ensure file names match exactly: `watched.csv`, `ratings.csv`, `diary.csv` |
| **Modal Won't Close** | No logs appear at all | Check console for JavaScript errors |
| **Files Persist in Dialog** | Old files still visible on re-open | This is now fixed - modal resets on close |

---

### What to Check in Browser Console

```javascript
// Check environment variables
console.log(process.env.NEXT_PUBLIC_API_URL)

// Check Zustand store state
// In console: (if useUploadStore is accessible)
useUploadStore.getState()

// Should show: { files: [], sessionId: null }
// After upload should show sessionId
```

---

### Backend Logs to Check

When upload happens, backend should log:

```
INFO:     POST /api/upload HTTP/1.1
Creating session...
Parsing files...
Storing movies...
[OK] Enrichment Worker status: enriching
```

If you don't see these, check if:
- Backend is actually running (check uvicorn output)
- API endpoint exists in `backend/app/api/upload.py`
- Database is accessible

---

### Quick Checklist

Before reporting as bug, verify:

- [ ] Browser console open and cleared
- [ ] Frontend URL is correct (http://localhost:3000)
- [ ] Backend running (http://localhost:8000/health returns `{"status":"healthy"}`)
- [ ] File names are EXACTLY: `watched.csv`, `ratings.csv`, `diary.csv` (case-sensitive)
- [ ] `NEXT_PUBLIC_API_URL` set correctly in `.env.local`
- [ ] No JavaScript errors in console

---

### Detailed Test Flow

1. **Open console** (F12 → Console)
2. **Go to analytics** (/analytics)
3. **Click Upload**
4. **Select CSV files** (should see green checkmarks)
5. **Click Continue**
6. **Watch console** for `[Analytics Upload]` logs
7. **Check Network tab** for `/api/upload` request
8. **Verify response** has `session_id`

**Expected Result:** Modal closes, progress bar appears within 2 seconds

---

### When All Else Fails

Run the diagnostic script:

```bash
cd backend
python test_worker_startup.py
```

This verifies:
- All imports work
- Database connection works
- TMDB client works
- Enrichment worker starts

If this passes but uploads still fail, the issue is in the frontend or API endpoint.
