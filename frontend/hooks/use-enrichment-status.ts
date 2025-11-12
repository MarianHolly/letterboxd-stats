import { useState, useEffect } from "react";
import axios from "axios";

interface EnrichmentStatus {
  status: "processing" | "enriching" | "completed" | "failed";
  total_movies: number;
  enriched_count: number;
  progress_percent?: number;
  created_at: string;
  expires_at: string;
  error_message?: string;
}

export function useEnrichmentStatus(
  sessionId: string | null,
  pollInterval = 2000
) {
  const [status, setStatus] = useState<EnrichmentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/session/${sessionId}/status`
        );
        const data = response.data;

        // Calculate progress percentage
        const progressPercent =
          data.total_movies > 0
            ? Math.round((data.enriched_count / data.total_movies) * 100)
            : 0;

        setStatus({
          ...data,
          progress_percent: progressPercent,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch status");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();

    // Poll at interval
    const interval = setInterval(fetchStatus, pollInterval);

    return () => clearInterval(interval);
  }, [sessionId, pollInterval]);

  return { status, isLoading, error };
}
