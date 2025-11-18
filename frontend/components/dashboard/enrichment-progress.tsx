"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface EnrichmentProgressProps {
  sessionId: string | null;
  pollInterval?: number;
  onComplete?: () => void;
}

interface EnrichmentStatus {
  status: "processing" | "enriching" | "completed" | "failed";
  total_movies: number;
  enriched_count: number;
  progress_percent?: number;
  created_at: string;
  expires_at: string;
  error_message?: string;
}

export function EnrichmentProgress({
  sessionId,
  pollInterval = 2000,
  onComplete,
}: EnrichmentProgressProps) {
  const [status, setStatus] = useState<EnrichmentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldStopPolling, setShouldStopPolling] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        // Use /api/session/{sessionId} endpoint (not /status)
        const response = await fetch(
          `${apiUrl}/api/session/${sessionId}`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (response.status === 404) {
          // Session not found - stop polling
          setShouldStopPolling(true);
          setError("Session not found or has expired");
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch enrichment status`);
        }

        const data = await response.json();

        // Calculate progress percentage
        const progressPercent =
          data.total_movies > 0
            ? Math.round((data.enriched_count / data.total_movies) * 100)
            : 0;

        const newStatus: EnrichmentStatus = {
          ...data,
          progress_percent: progressPercent,
        };

        setStatus(newStatus);
        setError(null);

        // Call onComplete when enrichment is done
        if (
          newStatus.status === "completed" &&
          newStatus.progress_percent === 100 &&
          onComplete
        ) {
          onComplete();
          setShouldStopPolling(true);
        }
      } catch (err) {
        // Only set error on first fetch or network errors
        if (!status) {
          const errorMsg = err instanceof Error ? err.message : "Failed to fetch status";
          setError(errorMsg);
        }
        // Stop polling if we get consistent errors (backend down, network issues)
        setShouldStopPolling(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (shouldStopPolling) return;

    // Fetch immediately
    fetchStatus();

    // Poll at interval (but stop if completed or error)
    if (status?.status !== "completed" && !shouldStopPolling) {
      const interval = setInterval(fetchStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [sessionId, pollInterval, status?.status, onComplete, shouldStopPolling]);

  if (!sessionId) {
    return null;
  }

  if (!status && isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm font-medium text-gray-700 dark:text-white/70">
            Loading enrichment status...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Error loading status
          </p>
        </div>
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const progressPercent = status.progress_percent || 0;
  const isComplete = status.status === "completed";
  const isFailed = status.status === "failed";

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete && (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
          {!isComplete && !isFailed && (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
          )}
          {isFailed && (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {isComplete && "✓ Enrichment Complete!"}
            {!isComplete && !isFailed && "Enriching movies..."}
            {isFailed && "Enrichment Failed"}
          </p>
        </div>
        <span className="text-xs font-medium text-gray-600 dark:text-white/60">
          {status.enriched_count}/{status.total_movies}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10 h-2">
        <div
          className={`h-full transition-all duration-300 ${
            isComplete
              ? "bg-green-600 dark:bg-green-400"
              : isFailed
              ? "bg-red-600 dark:bg-red-400"
              : "bg-indigo-600 dark:bg-indigo-400"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Progress Text */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600 dark:text-white/60">
          {progressPercent}% Complete
        </p>
        <p className="text-xs text-gray-500 dark:text-white/50">
          {status.status}
        </p>
      </div>

      {/* Error Message */}
      {isFailed && status.error_message && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3">
          <p className="text-xs text-red-600 dark:text-red-400">
            {status.error_message}
          </p>
        </div>
      )}

      {/* Additional Info */}
      {!isComplete && !isFailed && (
        <p className="text-xs text-gray-500 dark:text-white/50">
          {status.enriched_count} of {status.total_movies} movies enriched
          {status.enriched_count > 0 && (
            <>
              {" "}
              • Estimated {Math.ceil(
                ((status.total_movies - status.enriched_count) / 10) * 1000
              ) / 1000} seconds remaining
            </>
          )}
        </p>
      )}
    </div>
  );
}
