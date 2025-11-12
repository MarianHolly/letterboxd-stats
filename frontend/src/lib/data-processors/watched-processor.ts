/*
Processor for watched.csv file
- Parses watch history entries
- Normalizes movie information
- Returns: NormalizedMovie[], WatchHistoryEntry[]
*/

import Papa from 'papaparse';
import {
  NormalizedMovie,
  WatchHistoryEntry,
  ParseResult,
  RawCSVRow,
} from './types';
import {
  getColumnValue,
  parseDate,
  parseYear,
  generateMovieId,
  isValidMovieRecord,
  formatDateISO,
} from './normalize';

/**
 * Processes watched.csv file
 * Expected columns: Date, Name, Year, Letterboxd URI
 */
export function processWatchedFile(csvContent: string): {
  movies: NormalizedMovie[];
  watchHistory: WatchHistoryEntry[];
  errors: string[];
} {
  const movies: Map<string, NormalizedMovie> = new Map();
  const watchHistory: WatchHistoryEntry[] = [];
  const errors: string[] = [];

  if (!csvContent || csvContent.trim().length === 0) {
    return { movies: [], watchHistory: [], errors: ['No CSV content provided'] };
  }

  try {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      errors.push(`CSV parsing error: ${result.errors[0].message}`);
      return { movies: [], watchHistory: [], errors };
    }

    const rows = (result.data as RawCSVRow[]).filter(row =>
      Object.values(row).some(val => val !== null && val !== '')
    );

    rows.forEach((row, index) => {
      try {
        const name = getColumnValue(row, 'name') as string;
        const yearRaw = getColumnValue(row, 'year');
        const dateRaw = getColumnValue(row, 'date');
        const uri = getColumnValue(row, 'uri') as string | null;

        const year = parseYear(yearRaw);
        const date = parseDate(dateRaw);

        // Validate
        if (!isValidMovieRecord(name, year)) {
          errors.push(`Row ${index + 2}: Invalid movie record (missing name or year)`);
          return;
        }

        if (!date) {
          errors.push(`Row ${index + 2}: Invalid watch date`);
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

        // Add watch history entry
        watchHistory.push({
          movieId,
          date,
          dateISO: formatDateISO(date)!,
        });
      } catch (error) {
        errors.push(
          `Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    return {
      movies: Array.from(movies.values()),
      watchHistory,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to process watched file: ${errorMsg}`);
    return { movies: [], watchHistory: [], errors };
  }
}
