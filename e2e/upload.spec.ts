import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Create test CSV file
const testCsvPath = path.join(__dirname, 'test-diary.csv');
const testCsvContent = `Name,Year,Watched Date,Rating
The Matrix,1999,2024-01-15,5
Inception,2010,2024-01-10,4.5
Pulp Fiction,1994,2024-01-05,4
`;

test.beforeAll(() => {
  fs.writeFileSync(testCsvPath, testCsvContent);
});

test.afterAll(() => {
  if (fs.existsSync(testCsvPath)) {
    fs.unlinkSync(testCsvPath);
  }
});

test.describe('E2E - Upload Flow', () => {
  test('should load home page with upload form', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page.locator('h1')).toContainText('Letterboxd Quick Stats');

    // Check upload section
    await expect(page.locator('h2')).toContainText('Upload Your Diary');

    // Check upload button
    const uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await expect(uploadButton).toBeDisabled();
  });

  test('should enable upload button when file is selected', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    const uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await expect(uploadButton).toBeEnabled();
  });

  test('should display loading state during upload', async ({ page }) => {
    await page.goto('/');

    // Select file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    // Click upload
    const uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await uploadButton.click();

    // Check for loading state
    await expect(page.locator('button:has-text("Processing")')).toBeVisible();
  });

  test('should display movie data after successful upload', async ({ page }) => {
    await page.goto('/');

    // Select file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    // Click upload
    const uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await uploadButton.click();

    // Wait for results
    await expect(page.locator('h2:has-text("Most Recent Movie Watched")')).toBeVisible({
      timeout: 10000,
    });

    // Check movie details
    await expect(page.locator('text=The Matrix')).toBeVisible();
    await expect(page.locator('text=1999')).toBeVisible();
  });

  test('should display watched date in results', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    const uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await uploadButton.click();

    // Check for watched date
    await expect(page.locator('text=2024-01-15')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display user rating when available', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    const uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await uploadButton.click();

    // Check for rating display
    await expect(page.locator('text=Your Rating')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=5★')).toBeVisible();
  });
});

test.describe('E2E - Error Handling', () => {
  test('should show error for invalid CSV file', async ({ page }) => {
    await page.goto('/');

    // Create invalid CSV
    const invalidCsvPath = path.join(__dirname, 'test-invalid.csv');
    const invalidCsvContent = `InvalidColumn1,InvalidColumn2
Test1,Test2`;
    fs.writeFileSync(invalidCsvPath, invalidCsvContent);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidCsvPath);

    const uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await uploadButton.click();

    // Check for error message
    await expect(page.locator('text=/error|Error|invalid|Invalid/i')).toBeVisible({
      timeout: 10000,
    });

    // Cleanup
    fs.unlinkSync(invalidCsvPath);
  });

  test('should clear error when new file is selected', async ({ page }) => {
    await page.goto('/');

    // Create invalid CSV
    const invalidCsvPath = path.join(__dirname, 'test-invalid2.csv');
    const invalidCsvContent = `InvalidColumn1,InvalidColumn2
Test1,Test2`;
    fs.writeFileSync(invalidCsvPath, invalidCsvContent);

    // Upload invalid file
    let fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidCsvPath);

    let uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await uploadButton.click();

    // Wait for error
    await expect(page.locator('text=/error|Error|invalid|Invalid/i')).toBeVisible({
      timeout: 10000,
    });

    // Select new valid file
    fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    // Error should be cleared
    await expect(page.locator('text=/error|Error|invalid|Invalid/i')).not.toBeVisible();

    // Cleanup
    fs.unlinkSync(invalidCsvPath);
  });
});

test.describe('E2E - Page Navigation', () => {
  test('should show upload section on load', async ({ page }) => {
    await page.goto('/');

    const uploadSection = page.locator('div:has(h2:has-text("Upload Your Diary"))');
    await expect(uploadSection).toBeVisible();
  });

  test('should display both upload and results sections', async ({ page }) => {
    await page.goto('/');

    // Upload section should be visible
    await expect(page.locator('h2:has-text("Upload Your Diary")')).toBeVisible();

    // Results only appear after upload
    const resultsHeading = page.locator('h2:has-text("Most Recent Movie Watched")');
    await expect(resultsHeading).not.toBeVisible();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    const uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await uploadButton.click();

    // Now results should appear
    await expect(resultsHeading).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('E2E - Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Should still show all elements
    await expect(page.locator('h1')).toContainText('Letterboxd Quick Stats');
    await expect(page.locator('h2:has-text("Upload Your Diary")')).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    const uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await uploadButton.click();

    await expect(page.locator('h2:has-text("Most Recent Movie Watched")')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Letterboxd Quick Stats');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    const uploadButton = page.locator('button:has-text("Upload & Analyze")');
    await uploadButton.click();

    await expect(page.locator('h2:has-text("Most Recent Movie Watched")')).toBeVisible({
      timeout: 10000,
    });
  });
});
