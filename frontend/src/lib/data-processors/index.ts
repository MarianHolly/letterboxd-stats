/*
Main data processor orchestrator
- Combines all individual processors
- Builds unified enriched data structure
- Merges movie information from multiple sources
- Serves as entry point for all data processing
*/

import { EnrichedData } from './types';
import { processWatchedFile } from './watched-processor';
import { processDiaryFile } from './diary-processor';
import { processRatingsFile } from './ratings-processor';
import { processLikesFile } from './likes-processor';

export interface ProcessorInput {
  watchedCsv?: string;
  diaryCsv?: string;
  ratingsCsv?: string;
  likesCsv?: string;
}

export interface ProcessorOutput {
  enrichedData: EnrichedData;
  errors: {
    watched: string[];
    diary: string[];
    ratings: string[];
    likes: string[];
  };
}

/**
 * Main function to process all CSV files and build enriched data
 * @param input - Object containing CSV content strings
 * @returns Enriched data structure and any processing errors
 */
export function buildEnrichedData(input: ProcessorInput): ProcessorOutput {
  const allMovies = new Map();
  const errors = {
    watched: [] as string[],
    diary: [] as string[],
    ratings: [] as string[],
    likes: [] as string[],
  };

  // Process watched file
  let watchedMovies = [];
  let watchHistory = [];
  if (input.watchedCsv) {
    const result = processWatchedFile(input.watchedCsv);
    watchedMovies = result.movies;
    watchHistory = result.watchHistory;
    errors.watched = result.errors;

    result.movies.forEach(movie => {
      allMovies.set(movie.id, movie);
    });
  }

  // Process diary file
  let diaryMovies = [];
  let diaryEntries = [];
  if (input.diaryCsv) {
    const result = processDiaryFile(input.diaryCsv);
    diaryMovies = result.movies;
    diaryEntries = result.diaryEntries;
    errors.diary = result.errors;

    result.movies.forEach(movie => {
      const existing = allMovies.get(movie.id);
      if (existing) {
        // Merge movie info, preferring non-null values
        allMovies.set(movie.id, {
          ...existing,
          letterboxdUri: existing.letterboxdUri || movie.letterboxdUri,
        });
      } else {
        allMovies.set(movie.id, movie);
      }
    });
  }

  // Process ratings file
  let ratingsMovies = [];
  let ratings = [];
  if (input.ratingsCsv) {
    const result = processRatingsFile(input.ratingsCsv);
    ratingsMovies = result.movies;
    ratings = result.ratings;
    errors.ratings = result.errors;

    result.movies.forEach(movie => {
      const existing = allMovies.get(movie.id);
      if (existing) {
        allMovies.set(movie.id, {
          ...existing,
          letterboxdUri: existing.letterboxdUri || movie.letterboxdUri,
        });
      } else {
        allMovies.set(movie.id, movie);
      }
    });
  }

  // Process likes file
  let likesMovies = [];
  let likes = [];
  if (input.likesCsv) {
    const result = processLikesFile(input.likesCsv);
    likesMovies = result.movies;
    likes = result.likes;
    errors.likes = result.errors;

    result.movies.forEach(movie => {
      const existing = allMovies.get(movie.id);
      if (existing) {
        allMovies.set(movie.id, {
          ...existing,
          letterboxdUri: existing.letterboxdUri || movie.letterboxdUri,
        });
      } else {
        allMovies.set(movie.id, movie);
      }
    });
  }

  // Calculate metadata
  const allDates = [
    ...watchHistory.map(w => w.date),
    ...diaryEntries.map(d => d.watchedDate),
    ...ratings.map(r => r.dateRated),
    ...likes.map(l => l.dateLiked),
  ];

  const dateRangeStart = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null;
  const dateRangeEnd = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null;

  // Build enriched data
  const enrichedData: EnrichedData = {
    movies: allMovies,
    watchHistory,
    ratings,
    likes,
    diaryEntries,
    metadata: {
      lastUpdated: new Date(),
      totalMoviesTracked: allMovies.size,
      totalWatchCount: watchHistory.length,
      dateRangeStart,
      dateRangeEnd,
    },
  };

  return {
    enrichedData,
    errors,
  };
}

// Re-export types and processors for convenience
export * from './types';
export { processWatchedFile } from './watched-processor';
export { processDiaryFile } from './diary-processor';
export { processRatingsFile } from './ratings-processor';
export { processLikesFile } from './likes-processor';
export * from './normalize';
