/*
Fetches enriched data from backend session endpoint after enrichment completes.
This hook:
1. Takes a sessionId from the enrichment session
2. Polls the backend for enriched movies
3. Converts backend movies to EnrichedData format
4. Returns data once enrichment is complete
*/

import { useEffect, useState } from 'react';
import { EnrichedData, NormalizedMovie } from '@/src/lib/data-processors/types';

interface SessionMovie {
  title: string;
  year: number;
  rating: number | null;
  watched_date: string | null;
  rewatch: boolean;
  tags: string[];
  review: string | null;
  letterboxd_uri: string;
  genres: string[] | null;
  directors: string[] | null;
  cast: string[] | null;
  runtime: number | null;
}

interface MoviesListResponse {
  movies: SessionMovie[];
  total: number;
  page: number;
  per_page: number;
}

export function useEnrichedDataFromSession(sessionId: string | null) {
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setEnrichedData(null);
      return;
    }

    let isSubscribed = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchEnrichedData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        // Fetch all movies from the session
        // Use skip=0&limit=1000 to get most movies in one request
        const response = await fetch(
          `${apiUrl}/api/session/${sessionId}/movies?skip=0&limit=1000`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (response.status === 404) {
          setError('Session not found or expired');
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch enriched data`);
        }

        const data = await response.json();

        // Convert backend movies to EnrichedData format
        const movies = new Map<string, NormalizedMovie>();

        // API returns array directly, not {movies: [...]}
        const moviesList = Array.isArray(data) ? data : (data.movies || []);

        for (const movie of moviesList) {
          const normalized: NormalizedMovie = {
            uri: movie.letterboxd_uri,
            title: movie.title,
            year: movie.year,
            watched_date: movie.watched_date || undefined,
            rating: movie.rating || undefined,
            rewatch: movie.rewatch,
            tags: movie.tags || [],
            review: movie.review || undefined,
            // TMDB enrichment fields
            genres: movie.genres || [],
            directors: movie.directors || [],
            cast: movie.cast || [],
            runtime: movie.runtime || undefined,
          };

          movies.set(movie.letterboxd_uri, normalized);
        }

        // Create minimal EnrichedData object
        // (other fields like watch history, diary entries are not fetched here)
        const result: EnrichedData = {
          movies,
          watchHistory: [], // Not fetched from session endpoint
          diaryEntries: [],
          ratings: [],
          likes: [],
        };

        if (isSubscribed) {
          setEnrichedData(result);

          // Stop polling once we have data
          if (movies.size > 0 && pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      } catch (err) {
        if (isSubscribed) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to fetch enriched data';
          setError(errorMsg);
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    // Fetch data immediately
    fetchEnrichedData();

    // Poll every 2 seconds until we have data
    pollInterval = setInterval(fetchEnrichedData, 2000);

    // Cleanup on unmount or when sessionId changes
    return () => {
      isSubscribed = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [sessionId]);

  return { enrichedData, isLoading, error };
}
