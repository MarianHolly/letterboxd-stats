/*
Processor for likes.csv file
- Parses user likes for movies
- Normalizes movie information
- Returns: NormalizedMovie[], LikeEntry[]
*/

import Papa from 'papaparse';
import {
  NormalizedMovie,
  LikeEntry,
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
 * Processes likes.csv file
 * Expected columns: Date, Name, Year
 */
export function processLikesFile(csvContent: string): {
  movies: NormalizedMovie[];
  likes: LikeEntry[];
  errors: string[];
} {
  const movies: Map<string, NormalizedMovie> = new Map();
  const likes: LikeEntry[] = [];
  const errors: string[] = [];

  if (!csvContent || csvContent.trim().length === 0) {
    return { movies: [], likes: [], errors: ['No CSV content provided'] };
  }

  try {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      errors.push(`CSV parsing error: ${result.errors[0].message}`);
      return { movies: [], likes: [], errors };
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
        const dateLiked = parseDate(dateRaw);

        // Validate
        if (!isValidMovieRecord(name, year)) {
          errors.push(`Row ${index + 2}: Invalid movie record (missing name or year)`);
          return;
        }

        if (!dateLiked) {
          errors.push(`Row ${index + 2}: Invalid like date`);
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

        // Add like entry
        likes.push({
          movieId,
          dateLiked,
          dateLikedISO: formatDateISO(dateLiked)!,
        });
      } catch (error) {
        errors.push(
          `Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    return {
      movies: Array.from(movies.values()),
      likes,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to process likes file: ${errorMsg}`);
    return { movies: [], likes: [], errors };
  }
}
