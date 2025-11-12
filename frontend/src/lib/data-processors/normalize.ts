/*
Shared normalization utilities for data processing
- Column name mapping across different file formats
- Data type conversions
- Validation helpers
*/

/**
 * Maps various column name variations to standard names
 * Handles different CSV exports (older, newer, variant formats)
 */
export const columnNameMap = {
  // Date columns
  date: ['Date', 'date', 'DATE'],
  watchedDate: ['Watched Date', 'watched_date', 'watchedDate', 'WATCHED_DATE'],

  // Movie info
  name: ['Name', 'name', 'NAME', 'Title', 'title'],
  year: ['Year', 'year', 'YEAR', 'Release Year', 'release_year'],

  // Rating/engagement
  rating: ['Rating', 'rating', 'RATING', 'User Rating', 'user_rating'],

  // Diary specific
  rewatch: ['Rewatch', 'rewatch', 'REWATCH'],
  tags: ['Tags', 'tags', 'TAGS'],

  // Links
  uri: ['Letterboxd URI', 'uri', 'URI', 'url', 'URL'],
};

/**
 * Finds the actual column name in a data row by checking variations
 * @param row - Data row object
 * @param standardName - Standard name we're looking for
 * @returns The actual column name found in the row, or null
 */
export function findColumnName(
  row: Record<string, any>,
  standardName: keyof typeof columnNameMap
): string | null {
  const variations = columnNameMap[standardName];

  for (const variation of variations) {
    if (variation in row) {
      return variation;
    }
  }

  return null;
}

/**
 * Gets a column value safely, handling multiple name variations
 * @param row - Data row object
 * @param standardName - Standard name we're looking for
 * @returns The value from the column, or null if not found
 */
export function getColumnValue(
  row: Record<string, any>,
  standardName: keyof typeof columnNameMap
): any {
  const columnName = findColumnName(row, standardName);
  return columnName ? row[columnName] : null;
}

/**
 * Parses a date string to Date object
 * Handles common formats: YYYY-MM-DD, MM/DD/YYYY, etc.
 */
export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  try {
    const date = new Date(dateStr.trim());
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Parses a numeric value safely
 * @param value - Value to parse
 * @returns Parsed number or null
 */
export function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const num = parseFloat(String(value).trim());
  return isNaN(num) ? null : num;
}

/**
 * Parses a year value safely
 * @param value - Year value to parse
 * @returns Parsed year or null
 */
export function parseYear(value: any): number | null {
  const num = parseNumber(value);
  if (num === null || num < 1800 || num > new Date().getFullYear() + 5) {
    return null;
  }
  return Math.floor(num);
}

/**
 * Parses a rating value safely
 * Handles ratings like 3, 3.5, "4/5", "8/10"
 */
export function parseRating(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const str = String(value).trim();

  // Handle "X/10" or "X/5" format
  if (str.includes('/')) {
    const [num, denom] = str.split('/').map(s => parseFloat(s.trim()));
    if (!isNaN(num) && !isNaN(denom) && denom > 0) {
      // Convert to 5-point scale if needed
      if (denom === 10) {
        return (num / 10) * 5;
      }
      return num;
    }
  }

  // Handle simple numeric rating
  const num = parseFloat(str);
  if (!isNaN(num) && num >= 0 && num <= 10) {
    // Convert 10-point to 5-point if needed
    if (num > 5) {
      return (num / 10) * 5;
    }
    return num;
  }

  return null;
}

/**
 * Parses a boolean value
 * Handles: true/false, yes/no, 1/0, checked/unchecked
 */
export function parseBoolean(value: any): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const str = String(value).trim().toLowerCase();
  return ['true', 'yes', '1', 'checked', 'x', '✓'].includes(str);
}

/**
 * Generates a unique ID for a movie based on name and year
 * Not a perfect match but good enough for deduplication
 */
export function generateMovieId(name: string, year: number | null): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');

  const yearStr = year ? `_${year}` : '';
  return `${cleanName}${yearStr}`;
}

/**
 * Validates a movie record has required fields
 */
export function isValidMovieRecord(
  name: any,
  year: any
): boolean {
  return Boolean(name && String(name).trim().length > 0 && year);
}

/**
 * Formats a date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Formats a date for display
 */
export function formatDateDisplay(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
