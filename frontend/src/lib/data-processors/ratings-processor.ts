/*
Processor for ratings.csv file
- Parses user ratings for movies
- Normalizes movie information
- Returns: NormalizedMovie[], RatingEntry[]
*/

import Papa from 'papaparse';
import {
  NormalizedMovie,
  RatingEntry,
  RawCSVRow,
} from './types';
import {
  getColumnValue,
  parseDate,
  parseYear,
  parseRating,
  generateMovieId,
  isValidMovieRecord,
  formatDateISO,
} from './normalize';

/**
 * Processes ratings.csv file
 * Expected columns: Date, Name, Year, Rating
 */
export function processRatingsFile(csvContent: string): {
  movies: NormalizedMovie[];
  ratings: RatingEntry[];
  errors: string[];
} {
  const movies: Map<string, NormalizedMovie> = new Map();
  const ratings: RatingEntry[] = [];
  const errors: string[] = [];

  if (!csvContent || csvContent.trim().length === 0) {
    return { movies: [], ratings: [], errors: ['No CSV content provided'] };
  }

  try {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      errors.push(`CSV parsing error: ${result.errors[0].message}`);
      return { movies: [], ratings: [], errors };
    }

    const rows = (result.data as RawCSVRow[]).filter(row =>
      Object.values(row).some(val => val !== null && val !== '')
    );

    rows.forEach((row, index) => {
      try {
        const name = getColumnValue(row, 'name') as string;
        const yearRaw = getColumnValue(row, 'year');
        const dateRaw = getColumnValue(row, 'date');
        const ratingRaw = getColumnValue(row, 'rating');
        const uri = getColumnValue(row, 'uri') as string | null;

        const year = parseYear(yearRaw);
        const dateRated = parseDate(dateRaw);
        const rating = parseRating(ratingRaw);

        // Validate
        if (!isValidMovieRecord(name, year)) {
          errors.push(`Row ${index + 2}: Invalid movie record (missing name or year)`);
          return;
        }

        if (!dateRated) {
          errors.push(`Row ${index + 2}: Invalid rating date`);
          return;
        }

        if (rating === null) {
          errors.push(`Row ${index + 2}: Invalid rating value`);
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

        // Add rating entry
        ratings.push({
          movieId,
          rating,
          dateRated,
          dateRatedISO: formatDateISO(dateRated)!,
        });
      } catch (error) {
        errors.push(
          `Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    return {
      movies: Array.from(movies.values()),
      ratings,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to process ratings file: ${errorMsg}`);
    return { movies: [], ratings: [], errors };
  }
}
