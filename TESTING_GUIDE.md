# 🧪 Testing Guide - Letterboxd Stats

Complete guide for setting up, running, and writing tests for the Letterboxd Stats application.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Backend Testing](#backend-testing)
4. [Frontend Testing](#frontend-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Running All Tests](#running-all-tests)
7. [Writing New Tests](#writing-new-tests)
8. [CI/CD Integration](#cicd-integration)

---

## Quick Start

### Install All Testing Dependencies

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Run All Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd ../frontend
npm test

# E2E tests (requires both frontend and backend running)
npm run test:e2e
```

---

## Installation

### Backend Testing Setup

**Requirements:**
- Python 3.11+
- pytest 7.4.3
- pytest-asyncio 0.23.3
- pytest-cov 4.1.0

**Install:**
```bash
cd backend
pip install -r requirements.txt
```

**Verify Installation:**
```bash
pytest --version
# Should show: pytest 7.4.3
```

### Frontend Testing Setup

**Requirements:**
- Node.js 18+
- npm 9+

**Install:**
```bash
cd frontend
npm install
```

**Verify Installation:**
```bash
npm test -- --version
# Should show: Jest version and other info
```

### E2E Testing Setup

**Requirements:**
- Playwright
- Both frontend and backend running

**Install Playwright Browsers:**
```bash
cd frontend
npx playwright install
```

---

## Backend Testing

### Test Structure

```
backend/
├── tests/
│   ├── __init__.py
│   ├── test_csv_parsing.py      # CSV parsing & validation
│   └── test_api_endpoints.py    # API endpoint tests
├── pytest.ini                   # Pytest configuration
├── main.py                      # Application code
└── requirements.txt             # Dependencies
```

### Running Backend Tests

**All Tests:**
```bash
cd backend
pytest
```

**Specific Test File:**
```bash
pytest tests/test_csv_parsing.py
pytest tests/test_api_endpoints.py
```

**Specific Test:**
```bash
pytest tests/test_csv_parsing.py::TestCSVParsing::test_valid_csv_parsing
```

**With Coverage Report:**
```bash
pytest --cov=. --cov-report=html
# Opens: htmlcov/index.html
```

**Verbose Output:**
```bash
pytest -v
```

**Stop on First Failure:**
```bash
pytest -x
```

### Backend Test Coverage

Current test coverage:

| Component | Tests | Coverage |
|-----------|-------|----------|
| CSV Parsing | 12 tests | Column validation, date parsing, type conversion |
| API Endpoints | 18 tests | Health check, upload, error handling, TMDB integration |
| **Total** | **30 tests** | **Comprehensive** |

### Test Files Overview

#### `test_csv_parsing.py`
Tests CSV file parsing and data validation:
- Valid CSV parsing
- Column validation (Watched Date, Name)
- Date parsing and sorting
- Null value handling
- Type conversion
- Special characters in titles

**Run:**
```bash
pytest tests/test_csv_parsing.py -v
```

#### `test_api_endpoints.py`
Tests FastAPI endpoints and integrations:
- Health check endpoint
- Upload endpoint with valid CSV
- Error handling (missing columns, invalid format)
- TMDB API mocking and integration
- Error responses and status codes
- Network error handling

**Run:**
```bash
pytest tests/test_api_endpoints.py -v
```

### Mocking External APIs

Tests use `unittest.mock` to mock TMDB API calls:

```python
@patch('main.requests.get')
@patch.dict('os.environ', {'TMDB_API_KEY': 'test-key'})
def test_upload_with_tmdb_success(self, mock_get, client, valid_csv_data):
    # Mock response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "results": [{
            "title": "The Matrix",
            ...
        }]
    }
    mock_get.return_value = mock_response

    # Test code
    response = client.post("/upload", files={"file": ...})
    assert response.status_code == 200
```

### Common Backend Testing Patterns

**Testing async endpoints:**
```python
@pytest.mark.asyncio
async def test_async_endpoint():
    response = await client.post("/upload", ...)
    assert response.status_code == 200
```

**Testing with fixtures:**
```python
@pytest.fixture
def valid_csv_data():
    return b"Name,Year,Watched Date,Rating\n..."

def test_something(valid_csv_data):
    # Use valid_csv_data
```

**Testing error responses:**
```python
def test_error_handling(client):
    response = client.post("/upload", files={"file": ...})
    assert response.status_code == 400
    assert "error" in response.json()
```

---

## Frontend Testing

### Test Structure

```
frontend/
├── __tests__/
│   └── page.test.tsx            # Home page tests
├── jest.config.ts               # Jest configuration
├── jest.setup.ts                # Test setup (mocks, globals)
├── app/
│   └── page.tsx                 # Component to test
└── package.json                 # Test scripts
```

### Running Frontend Tests

**All Tests:**
```bash
cd frontend
npm test
```

**Specific Test File:**
```bash
npm test page.test.tsx
```

**Watch Mode (auto-rerun on changes):**
```bash
npm run test:watch
```

**Coverage Report:**
```bash
npm run test:coverage
```

**Update Snapshots (if using):**
```bash
npm test -- -u
```

### Frontend Test Coverage

Current test coverage:

| Component | Tests | Coverage |
|-----------|-------|----------|
| Upload Form | 6 tests | Form interaction, file selection, button states |
| Movie Display | 6 tests | Data rendering, missing data handling |
| Error Handling | 2 tests | Network errors, API errors |
| **Total** | **14 tests** | **Core user flows** |

### Test Files Overview

#### `__tests__/page.test.tsx`
Tests the Home page component:

**Upload Form Tests:**
- Renders upload form correctly
- File input enables/disables upload button
- Shows loading state during upload
- Displays error messages
- Clears errors when file changed

**Movie Display Tests:**
- Displays movie data after successful upload
- Shows user rating
- Shows TMDB rating
- Displays poster image
- Handles missing TMDB data gracefully

**Error Handling Tests:**
- Shows helpful error when backend is down
- Displays API error messages
- Handles network failures

**Run:**
```bash
npm test page.test.tsx -v
```

### Common Frontend Testing Patterns

**Rendering a Component:**
```typescript
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

it('renders the upload form', () => {
  render(<Home />);
  expect(screen.getByText('Upload Your Diary')).toBeInTheDocument();
});
```

**User Interactions:**
```typescript
import userEvent from '@testing-library/user-event';

it('enables upload button when file selected', async () => {
  const user = userEvent.setup();
  render(<Home />);

  const input = screen.getByRole('button');
  const file = new File(['content'], 'test.csv');
  await user.upload(input, file);

  const button = screen.getByRole('button', { name: /Upload/i });
  expect(button).toBeEnabled();
});
```

**Mocking Fetch:**
```typescript
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ title: 'The Matrix' })
  })
);
```

**Async Assertions:**
```typescript
import { waitFor } from '@testing-library/react';

it('displays data after upload', async () => {
  // ... upload file

  await waitFor(() => {
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
  });
});
```

---

## End-to-End Testing

### E2E Test Structure

```
project-root/
├── e2e/
│   └── upload.spec.ts           # Upload flow tests
├── playwright.config.ts          # Playwright configuration
└── package.json
```

### Running E2E Tests

**All E2E Tests:**
```bash
cd frontend
npm run test:e2e
```

**Interactive UI Mode:**
```bash
npm run test:e2e:ui
```

**Debug Mode (step-by-step):**
```bash
npm run test:e2e:debug
```

**Specific Test:**
```bash
npx playwright test e2e/upload.spec.ts
```

**Specific Browser:**
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**With Screenshots/Videos:**
```bash
npx playwright test --screenshot=only-on-failure
```

### E2E Test Coverage

Current tests cover:

| Scenario | Tests | Description |
|----------|-------|-------------|
| Upload Flow | 6 tests | Load page, select file, upload, display results |
| Error Handling | 2 tests | Invalid CSV, error clearing |
| Navigation | 2 tests | Page sections, conditional rendering |
| Responsive | 2 tests | Mobile & tablet viewports |

### Prerequisites for E2E Testing

**Backend must be running:**
```bash
docker-compose up backend db
# OR
cd backend && python -m uvicorn main:app --reload
```

**Frontend must be running:**
```bash
cd frontend && npm run dev
```

**OR let Playwright start them:**
```bash
npm run test:e2e
# Playwright will start both automatically
```

### Common E2E Testing Patterns

**Navigation:**
```typescript
import { test, expect } from '@playwright/test';

test('should load page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Title');
});
```

**File Upload:**
```typescript
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles('path/to/file.csv');
```

**Waiting for Elements:**
```typescript
await expect(page.locator('text=Results')).toBeVisible({
  timeout: 10000  // 10 second timeout
});
```

**Responsive Testing:**
```typescript
await page.setViewportSize({ width: 375, height: 667 }); // Mobile
await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
```

**Screenshots and Videos:**
```typescript
// Automatic on failure, or manual:
await page.screenshot({ path: 'screenshot.png' });
```

---

## Running All Tests

### Complete Test Suite

Run tests in this order:

1. **Backend Unit Tests** (fast)
```bash
cd backend
pytest
```

2. **Frontend Unit Tests** (fast)
```bash
cd frontend
npm test
```

3. **E2E Tests** (slower, requires services running)
```bash
cd frontend
npm run test:e2e
```

### Parallel Testing

**Backend:**
```bash
cd backend
pytest -n auto  # Uses all CPU cores
```

**Frontend:**
```bash
cd frontend
npm test -- --maxWorkers=4
```

### Generate Reports

**Backend Coverage:**
```bash
cd backend
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

**Frontend Coverage:**
```bash
cd frontend
npm run test:coverage
open coverage/lcov-report/index.html
```

**E2E Report:**
```bash
cd frontend
npm run test:e2e
npx playwright show-report
```

---

## Writing New Tests

### Backend Tests

1. **Create test function:**
```python
def test_my_feature():
    """Test description"""
    # Arrange
    input_data = ...

    # Act
    result = function_to_test(input_data)

    # Assert
    assert result == expected_value
```

2. **Use fixtures for reusable data:**
```python
@pytest.fixture
def my_data():
    return {"key": "value"}

def test_with_fixture(my_data):
    assert my_data["key"] == "value"
```

3. **Mock external dependencies:**
```python
@patch('module.external_function')
def test_with_mock(mock_func):
    mock_func.return_value = "mocked"
    # Test code
```

4. **Add to appropriate test file or create new:**
```bash
# tests/test_new_feature.py
```

### Frontend Tests

1. **Create test file:**
```typescript
// __tests__/component.test.tsx
import { render, screen } from '@testing-library/react';
import Component from '@/components/Component';

describe('Component', () => {
  it('should render', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

2. **Test user interactions:**
```typescript
import userEvent from '@testing-library/user-event';

it('should handle click', async () => {
  const user = userEvent.setup();
  render(<Component />);

  await user.click(screen.getByRole('button'));
  expect(screen.getByText('Result')).toBeInTheDocument();
});
```

3. **Mock API calls:**
```typescript
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ data: 'value' })
  })
);
```

### E2E Tests

1. **Create test file:**
```typescript
// e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test('user can do something', async ({ page }) => {
  await page.goto('/');
  // Test steps
});
```

2. **Use page actions:**
```typescript
await page.fill('input[id="name"]', 'Test');
await page.click('button:has-text("Submit")');
await expect(page.locator('text=Success')).toBeVisible();
```

3. **Test multiple browsers:**
```typescript
test.describe('Feature', () => {
  test('works in all browsers', async ({ page }) => {
    // Test runs on chromium, firefox, webkit
  });
});
```

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest --cov

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm test -- --coverage
      - run: cd frontend && npx playwright install
      - run: cd frontend && npm run test:e2e

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - uses: actions/setup-node@v3
      - run: docker-compose up -d
      - run: cd backend && pytest
      - run: cd frontend && npm run test:e2e
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running tests before commit..."

# Backend tests
cd backend
pytest || exit 1
cd ..

# Frontend tests
cd frontend
npm test -- --coverage || exit 1
cd ..

echo "All tests passed!"
```

---

## Troubleshooting

### Backend Issues

**Import Error: No module named 'main'**
```bash
# Make sure you're in the backend directory
cd backend
pytest
```

**Async Test Error**
```bash
# Use pytest-asyncio
pytest --asyncio-mode=auto
```

**TMDB Mock Not Working**
```python
# Ensure proper patching
@patch('main.requests.get')  # Patch where it's USED, not imported
def test_something(mock_get):
    ...
```

### Frontend Issues

**Module not found '@/...'**
```bash
# Check jest.config.ts moduleNameMapper
# Should map @/ to current directory
```

**Jest can't find file**
```bash
npm test -- --testPathPattern=page.test
```

**Fetch mock not working**
```typescript
// Mock must be before render
global.fetch = jest.fn(() => Promise.resolve(...));
```

### E2E Issues

**Timeout waiting for page**
```bash
# Increase timeout in playwright.config.ts
use: {
  navigationTimeout: 30000,
  actionTimeout: 10000,
}
```

**Element not found**
```typescript
// Check locator syntax
page.locator('button:has-text("Text")')
page.locator('input[type="file"]')
page.locator('text=Exact text')
```

**Browser not found**
```bash
# Install Playwright browsers
npx playwright install
```

---

## Best Practices

### ✅ Do:

- Write tests as you write code
- Name tests descriptively (`test_csv_parsing_with_valid_data`)
- Test edge cases (null values, empty strings, etc.)
- Use fixtures for reusable test data
- Mock external APIs
- Test error paths, not just happy paths
- Keep tests isolated and independent
- Use descriptive assertions

### ❌ Don't:

- Write tests after all code is done
- Use vague test names (`test_something`)
- Couple tests together
- Make actual API calls in tests
- Test implementation details
- Ignore test warnings
- Skip flaky tests without investigation
- Leave console.log or debug code

---

## Resources

### Documentation

- [pytest docs](https://docs.pytest.org/)
- [Jest docs](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright docs](https://playwright.dev/)

### Examples in This Project

- **CSV parsing tests:** `backend/tests/test_csv_parsing.py`
- **API tests:** `backend/tests/test_api_endpoints.py`
- **Component tests:** `frontend/__tests__/page.test.tsx`
- **E2E tests:** `e2e/upload.spec.ts`

---

## Summary

| Tool | Use Case | Command |
|------|----------|---------|
| **pytest** | Backend unit & integration tests | `pytest` |
| **Jest** | Frontend unit tests | `npm test` |
| **Playwright** | E2E browser automation | `npm run test:e2e` |

**Test Pyramid:**
```
    /\
   /  \  E2E Tests (slow, comprehensive)
  /----\
 /      \ Unit Tests (fast, specific)
/________\
```

Start with unit tests, use E2E for critical user flows.
