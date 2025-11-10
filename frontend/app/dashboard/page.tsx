"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { UploadModal } from "@/components/landing/upload-modal";
import { useUploadStore } from "@/hooks/use-upload-store";
import { useAnalytics } from "@/hooks/use-analytics";
import { BarChart3, Clock, Star, Film, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { ViewingOverTime } from "@/components/dashboard/charts/viewing-over-time";
import { RatingDistribution } from "@/components/dashboard/charts/rating-distribution";
import { GenreDistribution } from "@/components/dashboard/charts/genre-distribution";
import { ReleaseYearAnalysis } from "@/components/dashboard/charts/release-year-analysis";

interface UploadedFile {
  file: File;
  type: "watched" | "ratings" | "diary" | "unknown";
  status: "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export default function DashboardPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const files = useUploadStore((state) => state.files);
  const addFile = useUploadStore((state) => state.addFile);
  const clearFiles = useUploadStore((state) => state.clearFiles);

  const watchedFile = files.find((f) => f.type === "watched");
  const analytics = useAnalytics(watchedFile?.data || "");

  // Mark component as mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUploadComplete = async (uploadedFiles: UploadedFile[]) => {
    try {
      for (const file of uploadedFiles) {
        if (file.status === "success" && file.type !== "unknown") {
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
      }
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Error processing files. Please try again.");
    }
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to delete all imported data? This cannot be undone.")) {
      clearFiles();
    }
  };

  if (!mounted) {
    return <LoadingSkeleton />;
  }

  // Show empty state if no watched file uploaded
  if (!watchedFile) {
    return (
      <DashboardLayout>
        <EmptyState onUploadClick={() => setIsUploadModalOpen(true)} />
        <UploadModal
          open={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          onUploadComplete={handleUploadComplete}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Your Letterboxd Analytics"
        description="Insights into your movie-watching journey"
        onUploadClick={() => setIsUploadModalOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatsCard
            label="Total Movies"
            value={analytics.totalMovies}
            icon={<Film className="w-5 h-5" />}
            description={`${analytics.totalMovies} movies watched`}
            delay={0}
          />

          <StatsCard
            label="Average Rating"
            value={`${analytics.averageRating}★`}
            icon={<Star className="w-5 h-5" />}
            description="Your average rating"
            delay={0.1}
          />

          <StatsCard
            label="Total Hours"
            value={analytics.totalHoursWatched}
            icon={<Clock className="w-5 h-5" />}
            description="Hours of cinema"
            delay={0.2}
          />

          <StatsCard
            label="Tracking Period"
            value={`${analytics.totalDaysTracking}d`}
            icon={<TrendingUp className="w-5 h-5" />}
            description="Days of data"
            delay={0.3}
          />
        </motion.div>

        {/* Viewing Over Time - Full Width */}
        <DashboardSection
          title="Viewing Over Time"
          description="Track your movie watching trends across different time periods"
          delay={0.4}
        >
          {analytics.moviesPerMonth && Object.keys(analytics.moviesPerMonth).length > 0 ? (
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <ViewingOverTime data={analytics.moviesPerMonth} />
            </div>
          ) : (
            <div className="p-8 rounded-lg bg-white/5 border border-white/10 text-center">
              <p className="text-white/60">No data available</p>
            </div>
          )}
        </DashboardSection>

        {/* Rating Distribution & Future Section */}
        <DashboardSection
          title="Insights & Analysis"
          description="Rating patterns and additional analytics"
          delay={0.45}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rating Distribution Chart */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">
                Rating Distribution
              </h3>
              {analytics.ratingDistribution && Object.keys(analytics.ratingDistribution).length > 0 ? (
                <RatingDistribution data={analytics.ratingDistribution} />
              ) : (
                <div className="p-8 text-center">
                  <p className="text-white/60">No rating data available</p>
                </div>
              )}
            </div>

            {/* Reserved for Future */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center min-h-96">
              <div className="text-center">
                <p className="text-white/60">Coming Soon</p>
                <p className="text-sm text-white/40 mt-2">
                  Additional analytics reserved for future features
                </p>
              </div>
            </div>
          </div>
        </DashboardSection>

        {/* Genre Distribution & Future Section */}
        <DashboardSection
          title="Genre Analysis"
          description="Explore your favorite genres and preferences"
          delay={0.5}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Genre Distribution Chart */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">
                Genre Distribution
              </h3>
              {analytics.genreDistribution && Object.keys(analytics.genreDistribution).length > 0 ? (
                <GenreDistribution data={analytics.genreDistribution} />
              ) : (
                <div className="p-8 text-center">
                  <p className="text-white/60">No genre data available</p>
                </div>
              )}
            </div>

            {/* Reserved for Future */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center min-h-96">
              <div className="text-center">
                <p className="text-white/60">Coming Soon</p>
                <p className="text-sm text-white/40 mt-2">
                  Director analysis and genre trends reserved for future features
                </p>
              </div>
            </div>
          </div>
        </DashboardSection>

        {/* Release Year Analysis - Full Width */}
        <DashboardSection
          title="Movies by Release Year"
          description="See how many movies you watched from each release year"
          delay={0.55}
        >
          {analytics.moviesByReleaseYear && Object.keys(analytics.moviesByReleaseYear).length > 0 ? (
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <ReleaseYearAnalysis data={analytics.moviesByReleaseYear} />
            </div>
          ) : (
            <div className="p-8 rounded-lg bg-white/5 border border-white/10 text-center">
              <p className="text-white/60">No year data available</p>
            </div>
          )}
        </DashboardSection>

        {/* Data Summary */}
        <DashboardSection
          title="Imported Data"
          description={`${files.length} file${files.length !== 1 ? "s" : ""} loaded`}
          delay={0.6}
        >
          <div className="space-y-4">
            {/* File List */}
            <div className="space-y-2">
              {files.length > 0 ? (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{file.name}</p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <span className="text-xs text-indigo-400 capitalize">
                        {file.type}
                      </span>
                      <span className="text-xs text-white/40">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/60 py-4">No files imported yet</p>
              )}
            </div>

            {/* Clear Data Button */}
            {files.length > 0 && (
              <button
                onClick={handleClearData}
                className="w-full px-4 py-2.5 rounded-lg bg-red-600/20 border border-red-600/50 text-red-400 hover:bg-red-600/30 hover:border-red-600/70 transition-colors text-sm font-medium"
              >
                Clear All Data
              </button>
            )}
          </div>
        </DashboardSection>
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onUploadComplete={handleUploadComplete}
      />
    </DashboardLayout>
  );
}
