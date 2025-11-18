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
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/session/${sessionId}`
        );
        const data = response.data;

        // API already returns progress_percent, but calculate if needed
        const progressPercent = data.progress_percent ??
          (data.total_movies > 0
            ? Math.round((data.enriched_count / data.total_movies) * 100)
            : 0);

        setStatus({
          status: data.status,
          total_movies: data.total_movies,
          enriched_count: data.enriched_count,
          progress_percent: progressPercent,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          error_message: data.error_message,
        });
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch status";
        setError(errorMsg);
        console.error("Enrichment status error:", errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();

    // Poll at interval (stop polling if completed or failed)
    const interval = setInterval(() => {
      fetchStatus().catch(err => console.error("Poll error:", err));
    }, pollInterval);

    return () => clearInterval(interval);
  }, [sessionId, pollInterval]);

  return { status, isLoading, error };
}
