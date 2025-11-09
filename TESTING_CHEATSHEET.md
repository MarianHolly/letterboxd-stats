# 🧪 Testing Cheatsheet

Quick reference for running tests in the Letterboxd Stats application.

---

## Installation Commands

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
npx playwright install  # For E2E tests
```

---

## Running Tests

### Backend Tests

```bash
cd backend

# All tests
pytest

# Specific file
pytest tests/test_csv_parsing.py

# Specific test
pytest tests/test_csv_parsing.py::TestCSVParsing::test_valid_csv_parsing

# With coverage
pytest --cov=. --cov-report=html

# Verbose
pytest -v

# Stop on first failure
pytest -x

# Show print statements
pytest -s
```

### Frontend Tests

```bash
cd frontend

# All tests
npm test

# Watch mode (auto-rerun)
npm run test:watch

# Coverage report
npm run test:coverage

# Update snapshots
npm test -- -u

# Specific file
npm test page.test.tsx

# Verbose
npm test -- --verbose
```

### E2E Tests

```bash
cd frontend

# All E2E tests
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Specific test
npx playwright test e2e/upload.spec.ts

# Specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox

# Show report
npx playwright show-report
```

---

## Test Files Location

| Test Type | Location | Count |
|-----------|----------|-------|
| Backend Unit | `backend/tests/test_csv_parsing.py` | 12 |
| Backend Integration | `backend/tests/test_api_endpoints.py` | 18 |
| Frontend Unit | `frontend/__tests__/page.test.tsx` | 14 |
| E2E | `e2e/upload.spec.ts` | 12 |
| **Total** | - | **56** |

---

## What Gets Tested

### Backend

✅ CSV parsing and validation
✅ Column existence and types
✅ Date parsing and sorting
✅ Null value handling
✅ API endpoints (GET, POST)
✅ Error responses
✅ TMDB API integration (mocked)
✅ Network error handling

### Frontend

✅ Form rendering and interaction
✅ File input handling
✅ Button state management
✅ Loading states
✅ Error message display
✅ Movie data display
✅ Missing data handling
✅ API error handling

### E2E

✅ Full upload flow
✅ Page navigation
✅ Mobile responsive design
✅ Tablet responsive design
✅ Error handling
✅ Cross-browser compatibility

---

## Quick Test Patterns

### Backend - Test a Function

```python
def test_my_feature():
    # Arrange
    input_data = "test"

    # Act
    result = function_to_test(input_data)

    # Assert
    assert result == "expected"
```

### Backend - Mock External API

```python
@patch('main.requests.get')
def test_with_mock(mock_get):
    mock_get.return_value.json.return_value = {"key": "value"}
    # Test code
```

### Frontend - Render Component

```typescript
it('renders text', () => {
  render(<Component />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Frontend - User Interaction

```typescript
it('handles click', async () => {
  const user = userEvent.setup();
  render(<Component />);
  await user.click(screen.getByRole('button'));
  expect(screen.getByText('Clicked')).toBeInTheDocument();
});
```

### Frontend - Async Operations

```typescript
it('loads data', async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### E2E - Full Flow

```typescript
test('user can upload file', async ({ page }) => {
  await page.goto('/');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test.csv');

  await page.click('button:has-text("Upload")');

  await expect(page.locator('text=Success')).toBeVisible();
});
```

---

## Debugging Tests

### Backend Debug

```bash
# Print debug statements
pytest -s

# Drop into debugger
pytest --pdb

# Specific test with debug
pytest tests/test_csv_parsing.py::TestCSVParsing::test_something -s --pdb
```

### Frontend Debug

```bash
# Watch mode (see changes)
npm run test:watch

# Debug in browser
node --inspect-brk node_modules/.bin/jest --runInBand

# Show console logs
npm test -- --verbose
```

### E2E Debug

```bash
# Interactive debug
npm run test:e2e:debug

# See what's happening
npx playwright test --headed

# Slow motion (easier to see)
npx playwright test --headed --expect-timeout=5000
```

---

## Coverage Goals

| Area | Current | Target |
|------|---------|--------|
| Backend | 80%+ | 85%+ |
| Frontend | 70%+ | 80%+ |
| E2E | Core flows | All critical paths |

Check coverage:
```bash
# Backend
cd backend
pytest --cov-report=html
open htmlcov/index.html

# Frontend
cd frontend
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## CI/CD Pipeline

Tests run automatically on:
- ✅ Push to `main`, `develop`
- ✅ Pull requests to `main`, `develop`

Workflow: `.github/workflows/tests.yml`

Jobs:
1. Backend tests (Python 3.11)
2. Frontend tests (Node 18)
3. E2E tests (with services)
4. Coverage upload
5. Summary + PR comment

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'main'` | Run `cd backend` first |
| `Cannot find module '@/...'` | Check `jest.config.ts` moduleNameMapper |
| `Fetch is not defined` | Mock with `global.fetch = jest.fn()` |
| `Timeout waiting for element` | Increase timeout: `await expect(..., { timeout: 10000 })` |
| `Browser not found` | Run `npx playwright install` |
| `TMDB API not mocked` | Patch where imported: `@patch('main.requests.get')` |
| `Test passes locally, fails in CI` | Check environment variables in `.github/workflows/tests.yml` |

---

## Test First Workflow

```bash
# 1. Create test file
echo "Create __tests__/feature.test.tsx"

# 2. Write failing test
# (test should be red 🔴)

# 3. Run test
npm test

# 4. Write minimum code to pass
# (make test green 🟢)

# 5. Refactor with confidence
# (tests still green 🟢)

# 6. Commit
git add .
git commit -m "Add feature with tests"
```

---

## Test Commands Recap

```bash
# Setup
npm install              # Frontend
pip install -r requirements.txt  # Backend
npx playwright install   # E2E browsers

# Quick test
npm test                 # Frontend
pytest                   # Backend

# Coverage
npm run test:coverage    # Frontend
pytest --cov            # Backend

# E2E
npm run test:e2e         # Run E2E
npm run test:e2e:ui      # Visual mode
npm run test:e2e:debug   # Debug mode

# CI/CD
git push                 # Auto-runs tests on GitHub
```

---

## Resources

- 📖 [Full Testing Guide](./TESTING_GUIDE.md)
- 🧪 [Backend Tests](./backend/tests/)
- 🎨 [Frontend Tests](./frontend/__tests__/)
- 🎭 [E2E Tests](./e2e/)
- ⚙️ [CI/CD Config](./.github/workflows/tests.yml)

---

## Test Coverage Summary

```
Total Tests: 56
├── Backend: 30 tests
│   ├── CSV Parsing: 12
│   └── API Endpoints: 18
├── Frontend: 14 tests
│   ├── Upload Form: 6
│   ├── Movie Display: 6
│   └── Error Handling: 2
└── E2E: 12 tests
    ├── Upload Flow: 6
    ├── Error Handling: 2
    ├── Navigation: 2
    └── Responsive: 2
```

**Status: ✅ Ready for Development**

All infrastructure in place. Add tests as you code!
