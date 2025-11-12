/*
Unified data types for enriched movie data
- Represents the normalized state after all processors have run
- Serves as the single source of truth for all analytics
*/

/**
 * Normalized movie record
 * Merged from various sources: watched, diary, ratings, likes
 */
export interface NormalizedMovie {
  id: string; // Generated unique ID based on name + year
  name: string;
  year: number | null; // Release year
  letterboxdUri: string | null; // Link to Letterboxd
}

/**
 * Watch history entry
 * Records when a user watched a movie
 */
export interface WatchHistoryEntry {
  movieId: string;
  date: Date;
  dateISO: string; // YYYY-MM-DD format
}

/**
 * Rating entry
 * Records a user's rating for a movie
 */
export interface RatingEntry {
  movieId: string;
  rating: number; // 0-5 scale
  dateRated: Date;
  dateRatedISO: string; // YYYY-MM-DD format
}

/**
 * Like entry
 * Records when a user liked a movie
 */
export interface LikeEntry {
  movieId: string;
  dateLiked: Date;
  dateLikedISO: string; // YYYY-MM-DD format
}

/**
 * Diary entry
 * Detailed watching diary information
 */
export interface DiaryEntry {
  movieId: string;
  watchedDate: Date;
  watchedDateISO: string; // YYYY-MM-DD format
  rating: number | null; // 0-5 scale
  rewatch: boolean;
  tags: string[]; // Comma-separated tags split into array
}

/**
 * Complete enriched data structure
 * Single source of truth combining all file sources
 */
export interface EnrichedData {
  // Core movie information
  movies: Map<string, NormalizedMovie>;

  // Watch history (when movies were watched)
  watchHistory: WatchHistoryEntry[];

  // User ratings
  ratings: RatingEntry[];

  // User likes
  likes: LikeEntry[];

  // Detailed diary entries with watch dates
  diaryEntries: DiaryEntry[];

  // Metadata
  metadata: {
    lastUpdated: Date;
    totalMoviesTracked: number;
    totalWatchCount: number;
    dateRangeStart: Date | null;
    dateRangeEnd: Date | null;
  };
}

/**
 * Parser result for individual file types
 * Used by processors to return their parsed data
 */
export interface ParseResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  rowCount: number;
}

/**
 * Raw CSV row data before processing
 */
export interface RawCSVRow {
  [key: string]: string | number | boolean | null;
}
