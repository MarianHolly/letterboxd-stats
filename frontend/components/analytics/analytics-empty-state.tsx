"use client"

import { motion } from "framer-motion"
import { Upload, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AnalyticsEmptyStateProps {
  onUploadClick?: () => void
}

export function AnalyticsEmptyState({ onUploadClick }: AnalyticsEmptyStateProps) {
  return (
    <div className="flex-1 overflow-auto flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-xl w-full"
      >
        {/* Icon */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
          className="mb-8 flex justify-center"
        >
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 border border-white/10">
            <Upload className="w-12 h-12 text-indigo-400" />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          No Data Uploaded Yet
        </h1>

        {/* Description */}
        <p className="text-white/60 mb-8 leading-relaxed">
          Upload your Letterboxd CSV files to unlock detailed analytics and insights about your movie watching habits, favorite genres, directors, and more.
        </p>

        {/* Steps */}
        <div className="space-y-4 mb-10 text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              1
            </span>
            <div className="flex-1">
              <p className="text-white font-medium">Export Your Data</p>
              <p className="text-sm text-white/50">
                Go to Letterboxd Settings → Import & Export and download your CSV files
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              2
            </span>
            <div className="flex-1">
              <p className="text-white font-medium">Upload Files</p>
              <p className="text-sm text-white/50">
                You need at least &apos;watched.csv&apos;. Optionally add ratings.csv, diary.csv, and likes.csv
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              3
            </span>
            <div className="flex-1">
              <p className="text-white font-medium">TMDB Enrichment</p>
              <p className="text-sm text-white/50">
                Your data is automatically enriched with genres, directors, cast, and more from TMDB
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              4
            </span>
            <div className="flex-1">
              <p className="text-white font-medium">Explore Analytics</p>
              <p className="text-sm text-white/50">
                View detailed charts, trends, ratings, and personalized insights about your cinema journey
              </p>
            </div>
          </motion.div>
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={onUploadClick}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-6 rounded-lg text-lg transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/50 group w-full sm:w-auto"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Your Data
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        {/* Info */}
        <p className="text-xs text-white/40 mt-8">
          ✓ Your data stays completely private and secure. Never shared.
        </p>
      </motion.div>
    </div>
  )
}
