/*
Refactored analytics hook
- Receives enriched data (already processed and normalized)
- Focuses purely on analytics calculations
- Much simpler and more maintainable
- No CSV parsing, no data transformation
*/

import { useMemo } from 'react';
import { EnrichedData } from '@/src/lib/data-processors';

export interface DiaryStats {
  totalEntries: number;
  averagePerMonth: number;
  busiestMonth: string;
  busiestMonthCount: number;
  quietestMonth: string;
  quietestMonthCount: number;
  dateRange: string;
}

export interface Analytics {
  // Core statistics
  totalMovies: number;
  totalWatchCount: number;
  averageRating: number;
  totalRatings: number;
  totalLikes: number;

  // Temporal analysis
  totalDaysTracking: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;

  // Distribution data
  moviesByReleaseYear: Record<string, number>;
  ratingDistribution: Record<number, number>;
  yearsWatched: Record<string, number>;
  topWatchDates: Array<{ date: string; count: number }>;

  // Diary-specific analytics
  diaryByMonth: Array<{ month: string; count: number }>;
  diaryMonthlyByYear: Array<{ year: number; data: Array<{ month: string; count: number }> }>;
  diaryStats: DiaryStats;
}

export interface UseAnalyticsReturn extends Analytics {
  isLoading: boolean;
  error: string | null;
}

/**
 * Computes analytics from enriched data
 * Pure calculation logic - no data transformation
 * @param enrichedData - Normalized data from useEnrichedData hook
 * @returns Computed analytics metrics
 */
export function useAnalytics(enrichedData: EnrichedData | null): UseAnalyticsReturn {
  return useMemo(() => {
    // Default empty analytics
    const emptyAnalytics: UseAnalyticsReturn = {
      totalMovies: 0,
      totalWatchCount: 0,
      averageRating: 0,
      totalRatings: 0,
      totalLikes: 0,
      totalDaysTracking: 0,
      dateRangeStart: null,
      dateRangeEnd: null,
      moviesByReleaseYear: {},
      ratingDistribution: {},
      yearsWatched: {},
      topWatchDates: [],
      diaryByMonth: [],
      diaryMonthlyByYear: [],
      diaryStats: {
        totalEntries: 0,
        averagePerMonth: 0,
        busiestMonth: '',
        busiestMonthCount: 0,
        quietestMonth: '',
        quietestMonthCount: 0,
        dateRange: '',
      },
      isLoading: false,
      error: null,
    };

    if (!enrichedData) {
      return emptyAnalytics;
    }

    try {
      // ========== BASIC STATISTICS ==========
      const totalMovies = enrichedData.movies.size;
      const totalWatchCount = enrichedData.watchHistory.length;
      const totalRatings = enrichedData.ratings.length;
      const totalLikes = enrichedData.likes.length;

      // ========== RATING ANALYSIS ==========
      const ratings = enrichedData.ratings.map(r => r.rating);
      const averageRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : 0;

      // Rating distribution
      const ratingDistribution: Record<number, number> = {};
      ratings.forEach(rating => {
        const rounded = Math.round(rating * 2) / 2; // Round to nearest 0.5
        ratingDistribution[rounded] = (ratingDistribution[rounded] || 0) + 1;
      });

      // ========== TEMPORAL ANALYSIS ==========
      const { dateRangeStart, dateRangeEnd, totalDaysTracking } = (() => {
        const start = enrichedData.metadata.dateRangeStart;
        const end = enrichedData.metadata.dateRangeEnd;

        const totalDays =
          start && end
            ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        return {
          dateRangeStart: start ? formatDateISO(start) : null,
          dateRangeEnd: end ? formatDateISO(end) : null,
          totalDaysTracking: totalDays,
        };
      })();

      // ========== RELEASE YEAR ANALYSIS ==========
      const moviesByReleaseYear: Record<string, number> = {};
      enrichedData.movies.forEach(movie => {
        if (movie.year) {
          const year = movie.year.toString();
          moviesByReleaseYear[year] = (moviesByReleaseYear[year] || 0) + 1;
        }
      });

      // ========== YEARS WATCHED ANALYSIS ==========
      const yearsWatched: Record<string, number> = {};
      enrichedData.watchHistory.forEach(entry => {
        const year = entry.date.getFullYear().toString();
        yearsWatched[year] = (yearsWatched[year] || 0) + 1;
      });

      // Add diary entries to years watched
      enrichedData.diaryEntries.forEach(entry => {
        const year = entry.watchedDate.getFullYear().toString();
        yearsWatched[year] = (yearsWatched[year] || 0) + 1;
      });

      // ========== TOP WATCH DATES ==========
      const watchDateCounts: Record<string, number> = {};
      enrichedData.watchHistory.forEach(entry => {
        watchDateCounts[entry.dateISO] = (watchDateCounts[entry.dateISO] || 0) + 1;
      });

      enrichedData.diaryEntries.forEach(entry => {
        watchDateCounts[entry.watchedDateISO] =
          (watchDateCounts[entry.watchedDateISO] || 0) + 1;
      });

      const topWatchDates = Object.entries(watchDateCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // ========== DIARY ANALYTICS ==========
      let diaryByMonth: Array<{ month: string; count: number }> = [];
      let diaryMonthlyByYear: Array<{ year: number; data: Array<{ month: string; count: number }> }> = [];
      let diaryStats: DiaryStats = {
        totalEntries: 0,
        averagePerMonth: 0,
        busiestMonth: '',
        busiestMonthCount: 0,
        quietestMonth: '',
        quietestMonthCount: 0,
        dateRange: '',
      };

      if (enrichedData.diaryEntries.length > 0) {
        // Group diary entries by month
        const diaryMonthCounts: Record<string, number> = {};
        enrichedData.diaryEntries.forEach(entry => {
          const monthKey = entry.watchedDateISO.slice(0, 7); // YYYY-MM
          diaryMonthCounts[monthKey] = (diaryMonthCounts[monthKey] || 0) + 1;
        });

        // Format for area chart
        diaryByMonth = Object.entries(diaryMonthCounts)
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([monthKey, count]) => {
            const [year, monthNum] = monthKey.split('-');
            const date = new Date(parseInt(year), parseInt(monthNum) - 1);
            const monthName = date.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            });
            return { month: monthName, count };
          });

        // Group by year for radar chart (only fully recorded years)
        const diaryYearlyMonthly: Record<number, Record<number, number>> = {};
        enrichedData.diaryEntries.forEach(entry => {
          const year = entry.watchedDate.getFullYear();
          const month = entry.watchedDate.getMonth();

          if (!diaryYearlyMonthly[year]) {
            diaryYearlyMonthly[year] = {};
          }
          diaryYearlyMonthly[year][month] = (diaryYearlyMonthly[year][month] || 0) + 1;
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        diaryMonthlyByYear = Object.entries(diaryYearlyMonthly)
          .filter(([_, months]) => Object.keys(months).length === 12)
          .sort(([yearA], [yearB]) => parseInt(yearA) - parseInt(yearB))
          .map(([year, months]) => ({
            year: parseInt(year),
            data: monthNames.map((name, index) => ({
              month: name,
              count: months[index] || 0,
            })),
          }));

        // Calculate diary statistics
        const totalEntries = enrichedData.diaryEntries.length;
        const monthlyAverage = diaryByMonth.length > 0
          ? Math.round((totalEntries / diaryByMonth.length) * 10) / 10
          : 0;

        const monthCounts = Object.values(diaryMonthCounts);
        const busiestCount = Math.max(...monthCounts);
        const quietestCount = Math.min(...monthCounts);

        const busiestMonthKey = Object.entries(diaryMonthCounts).find(
          ([_, count]) => count === busiestCount
        )?.[0] || '';
        const quietestMonthKey = Object.entries(diaryMonthCounts).find(
          ([_, count]) => count === quietestCount
        )?.[0] || '';

        const formatMonthDate = (monthKey: string) => {
          const [year, month] = monthKey.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          });
        };

        const diaryDateRangeStart = enrichedData.diaryEntries.length > 0
          ? new Date(Math.min(...enrichedData.diaryEntries.map(d => d.watchedDate.getTime())))
          : null;
        const diaryDateRangeEnd = enrichedData.diaryEntries.length > 0
          ? new Date(Math.max(...enrichedData.diaryEntries.map(d => d.watchedDate.getTime())))
          : null;

        const diaryDateRangeStr = diaryDateRangeStart && diaryDateRangeEnd
          ? `${formatDateDisplay(diaryDateRangeStart)} - ${formatDateDisplay(diaryDateRangeEnd)}`
          : '';

        diaryStats = {
          totalEntries,
          averagePerMonth: monthlyAverage,
          busiestMonth: formatMonthDate(busiestMonthKey),
          busiestMonthCount: busiestCount,
          quietestMonth: formatMonthDate(quietestMonthKey),
          quietestMonthCount: quietestCount,
          dateRange: diaryDateRangeStr,
        };
      }

      // ========== RETURN ANALYTICS ==========
      return {
        totalMovies,
        totalWatchCount,
        averageRating,
        totalRatings,
        totalLikes,
        totalDaysTracking,
        dateRangeStart,
        dateRangeEnd,
        moviesByReleaseYear,
        ratingDistribution,
        yearsWatched,
        topWatchDates,
        diaryByMonth,
        diaryMonthlyByYear,
        diaryStats,
        isLoading: false,
        error: null,
      };
    } catch (error) {
      return {
        ...emptyAnalytics,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [enrichedData]);
}

// ========== HELPER FUNCTIONS ==========

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format date for display
 */
function formatDateDisplay(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
