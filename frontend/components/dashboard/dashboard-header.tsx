"use client";

import { useUploadStore } from "@/hooks/use-upload-store";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  onUploadClick?: () => void;
  onRefreshClick?: () => void;
}

export function DashboardHeader({
  title,
  description,
  onUploadClick,
  onRefreshClick,
}: DashboardHeaderProps) {
  const files = useUploadStore((state) => state.files);
  const watchedFile = files.find((f) => f.type === "watched");
  const lastUpdated = watchedFile?.uploadedAt;

  return (
    <div className="border-b border-white/10 bg-gradient-to-r from-slate-900/50 to-slate-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
            {description && (
              <p className="text-white/60">{description}</p>
            )}
            {lastUpdated && (
              <p className="text-sm text-white/40 mt-3">
                Last updated: {format(new Date(lastUpdated), "PPp")}
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {onRefreshClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshClick}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
            {onUploadClick && (
              <Button
                onClick={onUploadClick}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New Data
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
