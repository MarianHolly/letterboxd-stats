/*
Custom hook for unified enriched data state
- Takes raw CSV contents from upload store
- Processes through individual file processors
- Returns single enriched data object as source of truth
- Memoized to avoid unnecessary reprocessing
*/

import { useMemo } from 'react';
import {
  buildEnrichedData,
  EnrichedData,
  ProcessorInput,
} from '@/src/lib/data-processors';

export interface UseEnrichedDataReturn {
  enrichedData: EnrichedData | null;
  isLoading: boolean;
  errors: {
    watched: string[];
    diary: string[];
    ratings: string[];
    likes: string[];
  };
  hasData: boolean;
  totalErrors: number;
}

/**
 * Custom hook to build and manage enriched data from multiple CSV files
 * @param watchedCsv - Raw CSV content from watched.csv
 * @param diaryCsv - Raw CSV content from diary.csv (optional)
 * @param ratingsCsv - Raw CSV content from ratings.csv (optional)
 * @param likesCsv - Raw CSV content from likes.csv (optional)
 * @returns Enriched data object, loading state, and error information
 */
export function useEnrichedData(
  watchedCsv?: string,
  diaryCsv?: string,
  ratingsCsv?: string,
  likesCsv?: string
): UseEnrichedDataReturn {
  return useMemo(() => {
    // If no files provided, return empty state
    if (!watchedCsv && !diaryCsv && !ratingsCsv && !likesCsv) {
      return {
        enrichedData: null,
        isLoading: false,
        errors: {
          watched: [],
          diary: [],
          ratings: [],
          likes: [],
        },
        hasData: false,
        totalErrors: 0,
      };
    }

    try {
      // Build enriched data from all CSV inputs
      const input: ProcessorInput = {
        watchedCsv,
        diaryCsv,
        ratingsCsv,
        likesCsv,
      };

      const result = buildEnrichedData(input);

      // Check if we have any actual data
      const hasData =
        result.enrichedData.movies.size > 0 ||
        result.enrichedData.watchHistory.length > 0 ||
        result.enrichedData.diaryEntries.length > 0 ||
        result.enrichedData.ratings.length > 0 ||
        result.enrichedData.likes.length > 0;

      const totalErrors =
        result.errors.watched.length +
        result.errors.diary.length +
        result.errors.ratings.length +
        result.errors.likes.length;

      return {
        enrichedData: result.enrichedData,
        isLoading: false,
        errors: result.errors,
        hasData,
        totalErrors,
      };
    } catch (error) {
      // If processing fails completely, return error state
      return {
        enrichedData: null,
        isLoading: false,
        errors: {
          watched: [error instanceof Error ? error.message : 'Unknown error occurred'],
          diary: [],
          ratings: [],
          likes: [],
        },
        hasData: false,
        totalErrors: 1,
      };
    }
  }, [watchedCsv, diaryCsv, ratingsCsv, likesCsv]);
}

/**
 * Helper hook to get enriched data from upload store files
 * Combines useUploadStore and useEnrichedData for convenience
 */
export function useEnrichedDataFromStore() {
  const { useUploadStore } = require('@/hooks/use-upload-store');
  const files = useUploadStore((state: any) => state.files);

  const watchedFile = files.find((f: any) => f.type === 'watched');
  const diaryFile = files.find((f: any) => f.type === 'diary');
  const ratingsFile = files.find((f: any) => f.type === 'ratings');
  const likesFile = files.find((f: any) => f.type === 'likes');

  return useEnrichedData(
    watchedFile?.data,
    diaryFile?.data,
    ratingsFile?.data,
    likesFile?.data
  );
}
