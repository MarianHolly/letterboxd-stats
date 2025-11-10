import { useMemo } from "react";
import Papa from "papaparse";

export interface MovieRecord {
  name: string;
  watchedDate: string;
  rating?: number;
  [key: string]: any;
}

export interface Analytics {
  totalMovies: number;
  averageRating: number;
  totalHoursWatched: number;
  favoriteGenre: string | null;
  totalDaysTracking: number;
  moviesPerMonth: Record<string, number>;
  moviesByReleaseYear: Record<string, number>;
  genreDistribution: Record<string, number>;
  ratingDistribution: Record<number, number>;
  yearsWatched: Record<string, number>;
  topWatchDates: Array<{ date: string; count: number }>;
}

export interface UseAnalyticsReturn extends Analytics {
  isLoading: boolean;
  error: string | null;
  rawData: MovieRecord[];
}

/**
 * Custom hook to compute analytics from CSV data
 */
export function useAnalytics(csvContent: string): UseAnalyticsReturn {
  return useMemo(() => {
    try {
      if (!csvContent || csvContent.trim().length === 0) {
        return {
          totalMovies: 0,
          averageRating: 0,
          totalHoursWatched: 0,
          favoriteGenre: null,
          totalDaysTracking: 0,
          moviesPerMonth: {},
          moviesByReleaseYear: {},
          genreDistribution: {},
          ratingDistribution: {},
          yearsWatched: {},
          topWatchDates: [],
          isLoading: false,
          error: "No CSV data provided",
          rawData: [],
        };
      }

      const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (result.errors.length > 0) {
        return {
          totalMovies: 0,
          averageRating: 0,
          totalHoursWatched: 0,
          favoriteGenre: null,
          totalDaysTracking: 0,
          moviesPerMonth: {},
          moviesByReleaseYear: {},
          genreDistribution: {},
          ratingDistribution: {},
          yearsWatched: {},
          topWatchDates: [],
          isLoading: false,
          error: `CSV parsing error: ${result.errors[0].message}`,
          rawData: [],
        };
      }

      const data = (result.data as any[]).filter(
        (row) => row.Name || row["Watched Date"]
      );

      // Basic analytics
      const totalMovies = data.length;

      // Movies by release year (from Year column)
      const moviesByReleaseYear: Record<string, number> = {};
      data.forEach((row) => {
        const year = row.Year || row.year;
        if (year) {
          const yearStr = year.toString().trim();
          if (yearStr && !isNaN(parseInt(yearStr))) {
            moviesByReleaseYear[yearStr] =
              (moviesByReleaseYear[yearStr] || 0) + 1;
          }
        }
      });

      // Rating analysis
      const ratings = data
        .map((row) => {
          const rating = parseFloat(row.Rating || row.rating);
          return isNaN(rating) ? null : rating;
        })
        .filter((r) => r !== null) as number[];

      const averageRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : 0;

      // Rating distribution
      const ratingDistribution: Record<number, number> = {};
      ratings.forEach((rating) => {
        const roundedRating = Math.round(rating);
        ratingDistribution[roundedRating] =
          (ratingDistribution[roundedRating] || 0) + 1;
      });

      // Date analysis
      const dates = data
        .map((row) => {
          const dateStr = row["Watched Date"] || row["watched_date"];
          if (!dateStr) return null;
          try {
            return new Date(dateStr);
          } catch {
            return null;
          }
        })
        .filter((d) => d !== null) as Date[];

      const totalDaysTracking =
        dates.length > 1
          ? Math.ceil(
              (dates[0].getTime() - dates[dates.length - 1].getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

      // Movies per month
      const moviesPerMonth: Record<string, number> = {};
      dates.forEach((date) => {
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
        moviesPerMonth[monthKey] = (moviesPerMonth[monthKey] || 0) + 1;
      });

      // Years watched
      const yearsWatched: Record<string, number> = {};
      dates.forEach((date) => {
        const year = date.getFullYear().toString();
        yearsWatched[year] = (yearsWatched[year] || 0) + 1;
      });

      // Top watch dates (most common dates)
      const dateCounts: Record<string, number> = {};
      dates.forEach((date) => {
        const dateKey = date.toISOString().split("T")[0];
        dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
      });

      const topWatchDates = Object.entries(dateCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Genres (if available in data)
      const genreDistribution: Record<string, number> = {};
      data.forEach((row) => {
        const genres = row.Genres || row.genres || "";
        if (genres) {
          genres.split(",").forEach((genre: string) => {
            const trimmed = genre.trim();
            if (trimmed) {
              genreDistribution[trimmed] =
                (genreDistribution[trimmed] || 0) + 1;
            }
          });
        }
      });

      const favoriteGenre = Object.entries(genreDistribution).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || null;

      // Total hours watched (estimation if runtime available)
      let totalHoursWatched = 0;
      data.forEach((row) => {
        const runtime = parseFloat(row.Runtime || row.runtime);
        if (!isNaN(runtime)) {
          totalHoursWatched += runtime;
        }
      });
      totalHoursWatched = Math.round(totalHoursWatched / 60);

      return {
        totalMovies,
        averageRating,
        totalHoursWatched,
        favoriteGenre,
        totalDaysTracking,
        moviesPerMonth,
        moviesByReleaseYear,
        genreDistribution,
        ratingDistribution,
        yearsWatched,
        topWatchDates,
        isLoading: false,
        error: null,
        rawData: data as MovieRecord[],
      };
    } catch (error) {
      return {
        totalMovies: 0,
        averageRating: 0,
        totalHoursWatched: 0,
        favoriteGenre: null,
        totalDaysTracking: 0,
        moviesPerMonth: {},
        moviesByReleaseYear: {},
        genreDistribution: {},
        ratingDistribution: {},
        yearsWatched: {},
        topWatchDates: [],
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
        rawData: [],
      };
    }
  }, [csvContent]);
}
