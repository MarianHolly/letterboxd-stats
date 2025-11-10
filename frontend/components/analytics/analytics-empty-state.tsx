"use client"

import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AnalyticsEmptyStateProps {
  onUploadClick?: () => void
}

export function AnalyticsEmptyState({ onUploadClick }: AnalyticsEmptyStateProps) {
  return (
    <div className="flex-1 overflow-auto flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6 py-16 text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full bg-gray-100 dark:bg-white/10">
            <Upload className="w-8 h-8 text-gray-600 dark:text-white/60" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">
          No Data Yet
        </h2>

        <p className="text-gray-600 dark:text-white/60 mb-8">
          Upload your Letterboxd data to get started with detailed analytics and insights about your movie watching habits.
        </p>

        <Button
          onClick={onUploadClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Data
        </Button>

        <p className="text-sm text-gray-500 dark:text-white/40 mt-6">
          Don't have your Letterboxd data? Export it from your account settings.
        </p>
      </div>
    </div>
  )
}
