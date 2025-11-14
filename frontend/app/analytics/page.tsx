"use client";

import { useState } from "react";
import { AnalyticsSidebar } from "@/components/analytics/analytics-sidebar";
import { AnalyticsHeader } from "@/components/analytics/analytics-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { UploadModal } from "@/components/landing/upload-modal";

import { useAnalytics } from "@/hooks/use-analytics";
import { useUploadStore } from "@/hooks/use-upload-store";
import { useEnrichedDataFromStore } from "@/src/hooks/use-enriched-data";
import { ReleasedYearAnalysis } from "@/components/analytics/charts/release-year-analysis";
import { DiaryAreaChart } from "@/components/analytics/charts/diary-area-chart";
import { DiaryStatistics } from "@/components/analytics/charts/diary-statistics";
import { DiaryMonthlyRadarChart } from "@/components/analytics/charts/diary-monthly-radar-chart";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";

interface UploadedFile {
  file: File;
  type: "watched" | "ratings" | "diary" | "unknown";
  status: "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export default function AnalyticsPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { enrichedData } = useEnrichedDataFromStore();
  const analytics = useAnalytics(enrichedData);

  const addFile = useUploadStore((state) => state.addFile);
  const clearFiles = useUploadStore((state) => state.clearFiles);

  const handleUploadComplete = async (uploadedFiles: UploadedFile[]) => {
    try {
      // Prepare FormData for multipart upload
      const formData = new FormData();
      const validFiles = uploadedFiles.filter(
        (f) => f.status === "success" && f.type !== "unknown"
      );

      if (validFiles.length === 0) {
        alert("No valid files to upload");
        return;
      }

      // Add files to FormData
      for (const uploadedFile of validFiles) {
        formData.append("files", uploadedFile.file);
      }

      // Send to backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
      }

      const data = await response.json();
      const sessionId = data.session_id;

      // Store the real session ID from backend
      useUploadStore.setState({ sessionId });

      // Clear old data first
      clearFiles();

      // Also store files locally for offline access
      for (const file of validFiles) {
        const csvContent = await file.file.text();
        addFile({
          id: `${Date.now()}_${Math.random()}`,
          name: file.file.name,
          size: file.file.size,
          type: file.type,
          data: csvContent,
          uploadedAt: Date.now(),
        });
      }

      setIsUploadModalOpen(false);
    } catch (error) {
      console.error("Error uploading files:", error);
      alert(`Error uploading files: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Check if we have any data
  const hasData = enrichedData && enrichedData.length > 0;

  return (
    <SidebarProvider>
      <AnalyticsSidebar onUploadClick={() => setIsUploadModalOpen(true)} />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 scroll-smooth">
          <AnalyticsHeader
            title="Your true cinematic identity"
            description="Discover and explore your personality through Letterboxd statistics"
          />

          {!hasData ? (
            <AnalyticsEmptyState onUploadClick={() => setIsUploadModalOpen(true)} />
          ) : (
          <main className="flex-1 overflow-auto scroll-smooth">
            <div className="flex flex-1 flex-col gap-8 pt-8 px-8 pb-8 max-w-7xl mx-auto w-full">
              {/* Overview Section */}
              <section id="analytics-overview">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground dark:text-white mb-1">
                    Overview
                  </h2>
                  <p className="text-sm text-muted-foreground dark:text-white/60">
                    Key statistics and metrics about your viewing habits
                  </p>
                </div>
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                  <div className="bg-muted/50 dark:bg-white/5 aspect-video rounded-lg" />
                  <div className="bg-muted/50 dark:bg-white/5 aspect-video rounded-lg" />
                  <div className="bg-muted/50 dark:bg-white/5 aspect-video rounded-lg" />
                </div>
              </section>

              {/* Release Year Analysis */}
              <section id="analytics-release-year">
                {analytics.moviesByReleaseYear &&
                Object.keys(analytics.moviesByReleaseYear).length > 0 ? (
                  <ReleasedYearAnalysis data={analytics.moviesByReleaseYear} />
                ) : (
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-12 text-center">
                    <p className="text-slate-500 dark:text-white/60">
                      No release year data available. Upload your watched.csv to
                      see your analysis.
                    </p>
                  </div>
                )}
              </section>

              <section>
                {/* Diary Patterns */}
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground dark:text-white mb-1">
                    Diary Patterns
                  </h2>
                  <p className="text-sm text-muted-foreground dark:text-white/60">
                    Analyze your watching habits over time
                  </p>
                </div>

                <DiaryAreaChart data={analytics.diaryByMonth || []} />
               

                {/* Diary Statistics */}
                <DiaryStatistics stats={analytics.diaryStats} />
              </section>

              {/* Monthly Patterns Deep Dive */}
              <section id="analytics-monthly-patterns">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground dark:text-white mb-1">
                    Monthly Patterns Analysis
                  </h2>
                  <p className="text-sm text-muted-foreground dark:text-white/60">
                    Deep dive into your monthly viewing habits across years
                  </p>
                </div>
                <div className="w-full flex justify-center">
                  <div className="w-full max-w-4xl">

                    <DiaryMonthlyRadarChart
                      data={analytics.diaryMonthlyByYear || []}
                      size="large"
                    />
                    {/* Monthly Radar Chart 
                    */}
                  </div>
                </div>
              </section>

              {/* Genres & Directors Section */}
              <section id="analytics-genres">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground dark:text-white mb-1">
                    Genres & Directors
                  </h2>
                  <p className="text-sm text-muted-foreground dark:text-white/60">
                    Genre breakdown and your favorite directors
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-muted/50 dark:bg-white/5 min-h-80 rounded-lg" />
                  <div className="bg-muted/50 dark:bg-white/5 min-h-80 rounded-lg" />
                </div>
              </section>

              {/* Favorite Directors Section */}
              <section id="analytics-directors">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground dark:text-white mb-1">
                    Favorite Directors
                  </h2>
                  <p className="text-sm text-muted-foreground dark:text-white/60">
                    Your most watched directors and their filmography
                  </p>
                </div>
                <div className="bg-muted/50 dark:bg-white/5 min-h-96 rounded-lg" />
              </section>

              {/* Decade Analysis Section */}
              <section id="analytics-decades">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground dark:text-white mb-1">
                    Decade Analysis
                  </h2>
                  <p className="text-sm text-muted-foreground dark:text-white/60">
                    Movies by decade and era
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-muted/50 dark:bg-white/5 min-h-80 rounded-lg" />
                  <div className="bg-muted/50 dark:bg-white/5 min-h-80 rounded-lg" />
                </div>
              </section>
            </div>
          </main>
          )}
        </div>
        {/* Upload Modal */}
        <UploadModal
          open={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          onUploadComplete={handleUploadComplete}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
