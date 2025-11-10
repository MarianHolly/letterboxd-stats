"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight } from "lucide-react";

interface EmptyStateProps {
  onUploadClick?: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
          className="mb-6 flex justify-center"
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
          Upload your Letterboxd CSV files to get started with your personalized analytics and insights.
        </p>

        {/* Steps */}
        <div className="space-y-4 mb-8 text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              1
            </span>
            <div>
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
            className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              2
            </span>
            <div>
              <p className="text-white font-medium">Upload Here</p>
              <p className="text-sm text-white/50">
                You need at least the &apos;watched.csv&apos; file to get started
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              3
            </span>
            <div>
              <p className="text-white font-medium">View Analytics</p>
              <p className="text-sm text-white/50">
                Explore your viewing trends, genres, and personalized insights
              </p>
            </div>
          </motion.div>
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={onUploadClick}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-6 rounded-lg text-lg transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/50 group"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Your Data
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        {/* Info */}
        <p className="text-xs text-white/40 mt-8">
          Your data stays completely private and is never shared
        </p>
      </motion.div>
    </div>
  );
}
