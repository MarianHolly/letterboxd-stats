"use client";

import React, { useState, useEffect } from "react";
import { useUploadStore } from "@/hooks/use-upload-store";
import { useEnrichmentStatus } from "@/hooks/use-enrichment-status";
import { useEnrichedData } from "@/src/hooks/use-enriched-data";
import { useAnalytics } from "@/hooks/use-analytics";

/**
 * DATA FLOW ARCHITECTURE DEBUG PAGE
 *
 * Visualizes the complete data pipeline:
 * UPLOAD → PARSE → STORE → ENRICH → POLL → DISPLAY
 *
 * Shows real-time checkpoints for:
 * 1. File upload to backend
 * 2. CSV parsing and validation
 * 3. Database storage
 * 4. Background enrichment progress
 * 5. Enriched data retrieval
 * 6. Analytics calculation
 * 7. Frontend display
 */

type CheckpointStatus = "idle" | "pending" | "success" | "error";

interface Checkpoint {
  id: string;
  title: string;
  description: string;
  status: CheckpointStatus;
  timestamp?: Date;
  details?: Record<string, any>;
  error?: string;
  backgroundTasks?: string[];
}

interface DebugState {
  checkpoints: Checkpoint[];
  selectedFile: string | null;
  apiUrl: string;
  sessionInfo: {
    id: string | null;
    status: string | null;
    created_at: string | null;
  };
}

const CHECKPOINT_DEFINITIONS: Record<string, Omit<Checkpoint, "status" | "timestamp" | "details" | "error">> = {
  upload_ready: {
    id: "upload_ready",
    title: "Upload Ready",
    description: "System ready to accept file uploads",
    backgroundTasks: [],
  },
  files_selected: {
    id: "files_selected",
    title: "Files Selected",
    description: "User has selected CSV files to upload",
    backgroundTasks: [],
  },
  upload_started: {
    id: "upload_started",
    title: "Upload Started",
    description: "POST /api/upload initiated with FormData",
    backgroundTasks: ["Network request in flight"],
  },
  upload_success: {
    id: "upload_success",
    title: "Upload Successful",
    description: "Backend received files and created session",
    backgroundTasks: [
      "Backend validating CSV file types",
      "Detecting file types by filename",
    ],
  },
  session_created: {
    id: "session_created",
    title: "Session Created",
    description: "UUID session created in database",
    backgroundTasks: [
      "Parsing watched.csv",
      "Parsing ratings.csv (if provided)",
      "Parsing diary.csv (if provided)",
      "Parsing likes.csv (if provided)",
    ],
  },
  files_parsed: {
    id: "files_parsed",
    title: "CSV Files Parsed",
    description: "All CSV files parsed and validated",
    backgroundTasks: [
      "Grouping movies by Letterboxd URI",
      "Merging watch history, ratings, diary entries",
    ],
  },
  movies_stored: {
    id: "movies_stored",
    title: "Movies Stored in Database",
    description: "All movies bulk inserted with tmdb_enriched=False",
    backgroundTasks: [
      "Session status changed to 'enriching'",
      "APScheduler background worker waiting to trigger",
    ],
  },
  frontend_received_session: {
    id: "frontend_received_session",
    title: "Frontend Received Session ID",
    description: "Session ID stored in Zustand + localStorage",
    backgroundTasks: [
      "CSV data stored locally in browser",
      "Starting useEnrichmentStatus polling (every 2 seconds)",
    ],
  },
  csv_stored_locally: {
    id: "csv_stored_locally",
    title: "CSV Data Stored Locally",
    description: "File contents saved to Zustand for offline use",
    backgroundTasks: [],
  },
  polling_started: {
    id: "polling_started",
    title: "Enrichment Polling Started",
    description: "Frontend polling GET /api/session/{id}/status every 2 seconds",
    backgroundTasks: [
      "APScheduler background job may be running enrichment",
      "TMDB API calls happening in background (rate limited)",
      "Database being updated with enrichment data",
    ],
  },
  enrichment_progress: {
    id: "enrichment_progress",
    title: "Enrichment In Progress",
    description: "Movies being enriched with TMDB data",
    backgroundTasks: [
      "EnrichmentWorker.enrich_sessions() running every 10 seconds",
      "For each unenriched movie: search + fetch details + extract data",
      "Saving enriched data: genres, directors, cast, runtime, etc.",
      "Incrementing session.enriched_count",
    ],
  },
  enrichment_complete: {
    id: "enrichment_complete",
    title: "Enrichment Complete",
    description: "All movies enriched with TMDB metadata",
    backgroundTasks: [
      "Session status changed to 'completed'",
      "All movies have tmdb_enriched=True",
    ],
  },
  polling_stopped: {
    id: "polling_stopped",
    title: "Polling Stopped",
    description: "Frontend detected completion, stopped polling",
    backgroundTasks: [],
  },
  data_parsed_frontend: {
    id: "data_parsed_frontend",
    title: "Data Parsed in Frontend",
    description: "CSV string parsed into EnrichedData object using useEnrichedData()",
    backgroundTasks: [
      "processWatchedFile() parsing watched.csv",
      "processDiaryFile() parsing diary.csv (if provided)",
      "processRatingsFile() parsing ratings.csv (if provided)",
      "processLikesFile() parsing likes.csv (if provided)",
      "Merging movies by ID",
    ],
  },
  analytics_calculated: {
    id: "analytics_calculated",
    title: "Analytics Calculated",
    description: "Statistics computed from EnrichedData",
    backgroundTasks: [],
  },
  enriched_movies_fetched: {
    id: "enriched_movies_fetched",
    title: "Enriched Movies Fetched",
    description: "GET /api/session/{id}/movies retrieved TMDB metadata",
    backgroundTasks: [],
  },
  dashboard_rendered: {
    id: "dashboard_rendered",
    title: "Dashboard Rendered",
    description: "All charts and statistics displayed to user",
    backgroundTasks: [],
  },
};

const StatusColor = {
  idle: "bg-slate-700 text-slate-300",
  pending: "bg-yellow-700 text-yellow-200",
  success: "bg-green-700 text-green-100",
  error: "bg-red-700 text-red-100",
};

const StatusBadge = {
  idle: "border-slate-500 text-slate-400",
  pending: "border-yellow-500 text-yellow-400",
  success: "border-green-500 text-green-400",
  error: "border-red-500 text-red-400",
};

export default function DataFlowDebugPage() {
  const [state, setState] = useState<DebugState>({
    checkpoints: Object.values(CHECKPOINT_DEFINITIONS).map(cp => ({
      ...cp,
      status: "idle" as CheckpointStatus,
    })),
    selectedFile: null,
    apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    sessionInfo: {
      id: null,
      status: null,
      created_at: null,
    },
  });

  const files = useUploadStore((state) => state.files);
  const addFile = useUploadStore((state) => state.addFile);
  const setSessionId = useUploadStore((state) => state.setState);

  const { status: enrichmentStatus } = useEnrichmentStatus(state.sessionInfo.id);

  const watchedFile = files.find((f) => f.type === "watched");
  const enrichedData = useEnrichedData(watchedFile?.data);
  const analytics = useAnalytics(enrichedData);

  // Initialize first checkpoint
  useEffect(() => {
    updateCheckpoint("upload_ready", "success");
  }, []);

  // Update session info from store
  useEffect(() => {
    const unsubscribe = useUploadStore.subscribe(
      (store) => store.sessionId,
      (sessionId) => {
        if (sessionId) {
          setState((prev) => ({
            ...prev,
            sessionInfo: { ...prev.sessionInfo, id: sessionId },
          }));
          updateCheckpoint("frontend_received_session", "success", { sessionId });
        }
      }
    );
    return unsubscribe;
  }, []);

  // Update enrichment status checkpoint
  useEffect(() => {
    if (!enrichmentStatus) return;

    if (enrichmentStatus.status === "processing") {
      updateCheckpoint("session_created", "success");
    } else if (enrichmentStatus.status === "enriching") {
      updateCheckpoint("movies_stored", "success");
      updateCheckpoint("polling_started", "success");
      updateCheckpoint("enrichment_progress", "pending", {
        enriched_count: enrichmentStatus.enriched_count,
        total_movies: enrichmentStatus.total_movies,
        progress_percent: enrichmentStatus.progress_percent || 0,
      });
    } else if (enrichmentStatus.status === "completed") {
      updateCheckpoint("enrichment_complete", "success", {
        total_enriched: enrichmentStatus.enriched_count,
        total_movies: enrichmentStatus.total_movies,
      });
      updateCheckpoint("polling_stopped", "success");
    } else if (enrichmentStatus.status === "failed") {
      updateCheckpoint("enrichment_progress", "error", {
        error: enrichmentStatus.error_message,
      });
    }
  }, [enrichmentStatus]);

  // Update CSV parsing checkpoint
  useEffect(() => {
    if (watchedFile && !enrichedData) {
      updateCheckpoint("files_selected", "success", { file: watchedFile.name });
    }
  }, [watchedFile]);

  // Update data parsed checkpoint
  useEffect(() => {
    if (enrichedData && enrichedData.movies && enrichedData.movies.size > 0) {
      updateCheckpoint("data_parsed_frontend", "success", {
        total_movies: enrichedData.movies.size,
        watch_history_entries: enrichedData.watchHistory.length,
        ratings_entries: enrichedData.ratings.length,
      });
    }
  }, [enrichedData]);

  // Update analytics checkpoint
  useEffect(() => {
    if (analytics && analytics.totalMovies > 0) {
      updateCheckpoint("analytics_calculated", "success", {
        total_movies: analytics.totalMovies,
        average_rating: analytics.averageRating,
        total_days_tracking: analytics.totalDaysTracking,
      });
      updateCheckpoint("dashboard_rendered", "success");
    }
  }, [analytics]);

  const updateCheckpoint = (
    id: string,
    status: CheckpointStatus,
    details?: Record<string, any>
  ) => {
    setState((prev) => ({
      ...prev,
      checkpoints: prev.checkpoints.map((cp) =>
        cp.id === id
          ? {
              ...cp,
              status,
              timestamp: new Date(),
              details: { ...cp.details, ...details },
            }
          : cp
      ),
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    updateCheckpoint("files_selected", "success", {
      file_count: uploadedFiles.length,
    });

    const formData = new FormData();
    const fileArray = Array.from(uploadedFiles);

    for (const file of fileArray) {
      formData.append("files", file);
    }

    try {
      updateCheckpoint("upload_started", "pending", {
        files: fileArray.map((f) => ({ name: f.name, size: f.size })),
      });

      const response = await fetch(`${state.apiUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Mark upload_started as success
      updateCheckpoint("upload_started", "success", {
        files: fileArray.map((f) => ({ name: f.name, size: f.size })),
      });

      updateCheckpoint("upload_success", "success", {
        session_id: data.session_id,
        status: data.status,
        total_movies: data.total_movies,
        created_at: data.created_at,
      });

      setState((prev) => ({
        ...prev,
        sessionInfo: {
          id: data.session_id,
          status: data.status,
          created_at: data.created_at,
        },
      }));

      // Store files locally
      for (const file of fileArray) {
        const content = await file.text();
        const fileType =
          (file.name.toLowerCase().includes("watched") && "watched") ||
          (file.name.toLowerCase().includes("diary") && "diary") ||
          (file.name.toLowerCase().includes("ratings") && "ratings") ||
          (file.name.toLowerCase().includes("likes") && "likes") ||
          "unknown";

        addFile({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          size: file.size,
          type: fileType as any,
          data: content,
          uploadedAt: Date.now(),
        });
      }

      updateCheckpoint("csv_stored_locally", "success", {
        files_stored: fileArray.length,
      });

      setSessionId((state: any) => ({
        ...state,
        sessionId: data.session_id,
      }));
    } catch (error) {
      updateCheckpoint("upload_started", "error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleClearDebugData = () => {
    setState((prev) => ({
      ...prev,
      checkpoints: Object.values(CHECKPOINT_DEFINITIONS).map(cp => ({
        ...cp,
        status: "idle" as CheckpointStatus,
      })),
      sessionInfo: {
        id: null,
        status: null,
        created_at: null,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">
            Data Flow Debug
          </h1>
          <p className="text-slate-400 text-lg mb-4">
            Track data pipeline from upload through enrichment to display
          </p>
          <p className="text-slate-500 text-sm font-mono">
            Reference: DATA_FLOW_ARCHITECTURE.md
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Upload CSV Files</h2>

          <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-slate-750 transition">
            <input
              type="file"
              multiple
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer block"
            >
              <div className="text-6xl mb-4">📁</div>
              <p className="text-white text-lg font-medium mb-2">
                Drop CSV files here or click to select
              </p>
              <p className="text-slate-400">
                Accepts: watched.csv, ratings.csv, diary.csv, likes.csv
              </p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                Uploaded Files ({files.length})
              </h3>
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 bg-slate-700 p-3 rounded border border-slate-600"
                  >
                    <span className="text-green-400">✓</span>
                    <span className="text-white text-sm flex-1">{file.name}</span>
                    <span className="text-slate-400 text-xs">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Session Info */}
        {state.sessionInfo.id && (
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-6 mb-8">
            <h3 className="text-white font-semibold mb-4">Session Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-blue-200 text-xs mb-1">Session ID</p>
                <p className="text-white font-mono text-sm break-all">
                  {state.sessionInfo.id}
                </p>
              </div>
              <div>
                <p className="text-blue-200 text-xs mb-1">Status</p>
                <p className="text-white font-semibold">
                  {enrichmentStatus?.status || "unknown"}
                </p>
              </div>
              <div>
                <p className="text-blue-200 text-xs mb-1">Created</p>
                <p className="text-white text-sm">
                  {state.sessionInfo.created_at
                    ? new Date(state.sessionInfo.created_at).toLocaleString()
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Checkpoints Timeline */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Data Flow Checkpoints</h2>
            {state.checkpoints.some((cp) => cp.status !== "idle") && (
              <button
                onClick={handleClearDebugData}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition"
              >
                Clear Debug
              </button>
            )}
          </div>

          <div className="space-y-4">
            {state.checkpoints.map((checkpoint, index) => (
              <div
                key={checkpoint.id}
                className="relative"
              >
                {/* Timeline Line */}
                {index < state.checkpoints.length - 1 && (
                  <div
                    className={`absolute left-6 top-16 w-0.5 h-12 ${
                      checkpoint.status !== "idle"
                        ? "bg-green-500"
                        : "bg-slate-600"
                    }`}
                  />
                )}

                {/* Checkpoint Card */}
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition">
                  <div className="flex items-start gap-4">
                    {/* Status Badge */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      checkpoint.status === "idle"
                        ? "bg-slate-700 border-slate-600 text-slate-500"
                        : checkpoint.status === "success"
                        ? "bg-green-900 border-green-500 text-green-300"
                        : checkpoint.status === "pending"
                        ? "bg-yellow-900 border-yellow-500 text-yellow-300"
                        : "bg-red-900 border-red-500 text-red-300"
                    }`}>
                      {checkpoint.status === "idle" ? "○" : checkpoint.status === "success" ? "✓" : checkpoint.status === "pending" ? "⟳" : "✕"}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-1">
                        {checkpoint.title}
                      </h3>
                      <p className="text-slate-400 text-sm mb-3">
                        {checkpoint.description}
                      </p>

                      {/* Details */}
                      {checkpoint.details && Object.keys(checkpoint.details).length > 0 && (
                        <div className="bg-slate-900 rounded p-3 mb-3 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto">
                          <pre>{JSON.stringify(checkpoint.details, null, 2)}</pre>
                        </div>
                      )}

                      {/* Error */}
                      {checkpoint.error && (
                        <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-3 mb-3 font-mono text-xs text-red-200">
                          {checkpoint.error}
                        </div>
                      )}

                      {/* Background Tasks */}
                      {checkpoint.backgroundTasks && checkpoint.backgroundTasks.length > 0 && (
                        <div className="bg-slate-700 bg-opacity-50 rounded p-3">
                          <p className="text-slate-300 text-xs font-semibold mb-2">
                            Background Tasks:
                          </p>
                          <ul className="space-y-1">
                            {checkpoint.backgroundTasks.map((task, idx) => (
                              <li key={idx} className="text-slate-400 text-xs flex items-start gap-2">
                                <span className="text-slate-500 flex-shrink-0">→</span>
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Timestamp */}
                      {checkpoint.timestamp && (
                        <p className="text-slate-500 text-xs mt-3">
                          {checkpoint.timestamp.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enrichment Progress */}
        {enrichmentStatus && enrichmentStatus.status === "enriching" && (
          <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-6 mb-8">
            <h3 className="text-yellow-300 font-semibold mb-4">
              Enrichment Progress
            </h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-yellow-200 mb-2">
                <span>
                  {enrichmentStatus.enriched_count} / {enrichmentStatus.total_movies} movies
                </span>
                <span>{enrichmentStatus.progress_percent || 0}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${enrichmentStatus.progress_percent || 0}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-slate-300 text-sm">
              Backend enrichment worker running in background. Polling every 2 seconds...
            </p>
          </div>
        )}

        {/* Data Statistics */}
        {analytics && analytics.totalMovies > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Total Movies
              </p>
              <p className="text-3xl font-bold text-white">
                {analytics.totalMovies}
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Average Rating
              </p>
              <p className="text-3xl font-bold text-yellow-400">
                {analytics.averageRating.toFixed(1)}
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Total Ratings
              </p>
              <p className="text-3xl font-bold text-blue-400">
                {analytics.totalRatings}
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Tracking Days
              </p>
              <p className="text-3xl font-bold text-green-400">
                {analytics.totalDaysTracking}
              </p>
            </div>
          </div>
        )}

        {/* EnrichedData Status */}
        {enrichedData && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h3 className="text-white font-semibold mb-4">Frontend Data State</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono text-slate-300">
              <div>
                <p className="text-slate-400 mb-1">Parsed Movies</p>
                <p className="text-white text-lg">{enrichedData.movies?.size || 0}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Watch History Entries</p>
                <p className="text-white text-lg">
                  {enrichedData.watchHistory?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Ratings</p>
                <p className="text-white text-lg">
                  {enrichedData.ratings?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Likes</p>
                <p className="text-white text-lg">
                  {enrichedData.likes?.length || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Configuration */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Configuration</h3>
          <div className="space-y-2 text-sm font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">API Base URL:</span>
              <span className="text-white">{state.apiUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Polling Interval:</span>
              <span className="text-white">2000ms (2 seconds)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Enrichment Worker Interval:</span>
              <span className="text-white">10000ms (10 seconds) - Backend</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
