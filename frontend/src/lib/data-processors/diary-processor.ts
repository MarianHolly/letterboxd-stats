/*
Processor for diary.csv file
- Parses diary entries with watch dates and ratings
- Normalizes movie information
- Returns: NormalizedMovie[], DiaryEntry[]
*/

import Papa from 'papaparse';
import {
  NormalizedMovie,
  DiaryEntry,
  RawCSVRow,
} from './types';
import {
  getColumnValue,
  parseDate,
  parseYear,
  parseRating,
  parseBoolean,
  generateMovieId,
  isValidMovieRecord,
  formatDateISO,
} from './normalize';

/**
 * Processes diary.csv file
 * Expected columns: Date, Name, Year, Watched Date, Rating, Rewatch, Tags
 */
export function processDiaryFile(csvContent: string): {
  movies: NormalizedMovie[];
  diaryEntries: DiaryEntry[];
  errors: string[];
} {
  const movies: Map<string, NormalizedMovie> = new Map();
  const diaryEntries: DiaryEntry[] = [];
  const errors: string[] = [];

  if (!csvContent || csvContent.trim().length === 0) {
    return { movies: [], diaryEntries: [], errors: ['No CSV content provided'] };
  }

  try {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      errors.push(`CSV parsing error: ${result.errors[0].message}`);
      return { movies: [], diaryEntries: [], errors };
    }

    const rows = (result.data as RawCSVRow[]).filter(row =>
      Object.values(row).some(val => val !== null && val !== '')
    );

    rows.forEach((row, index) => {
      try {
        const name = getColumnValue(row, 'name') as string;
        const yearRaw = getColumnValue(row, 'year');
        const watchedDateRaw = getColumnValue(row, 'watchedDate');
        const ratingRaw = getColumnValue(row, 'rating');
        const rewatchRaw = getColumnValue(row, 'rewatch');
        const tagsRaw = getColumnValue(row, 'tags') as string | null;
        const uri = getColumnValue(row, 'uri') as string | null;

        const year = parseYear(yearRaw);
        const watchedDate = parseDate(watchedDateRaw);
        const rating = parseRating(ratingRaw);
        const rewatch = parseBoolean(rewatchRaw);

        // Validate
        if (!isValidMovieRecord(name, year)) {
          errors.push(`Row ${index + 2}: Invalid movie record (missing name or year)`);
          return;
        }

        if (!watchedDate) {
          errors.push(`Row ${index + 2}: Invalid watched date`);
          return;
        }

        // Generate or get movie ID
        const movieId = generateMovieId(name, year);

        // Add to movies map if not exists
        if (!movies.has(movieId)) {
          movies.set(movieId, {
            id: movieId,
            name: name.trim(),
            year,
            letterboxdUri: uri || null,
          });
        }

        // Parse tags
        const tags = tagsRaw
          ? tagsRaw
              .split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
          : [];

        // Add diary entry
        diaryEntries.push({
          movieId,
          watchedDate,
          watchedDateISO: formatDateISO(watchedDate)!,
          rating,
          rewatch,
          tags,
        });
      } catch (error) {
        errors.push(
          `Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    return {
      movies: Array.from(movies.values()),
      diaryEntries,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to process diary file: ${errorMsg}`);
    return { movies: [], diaryEntries: [], errors };
  }
}
