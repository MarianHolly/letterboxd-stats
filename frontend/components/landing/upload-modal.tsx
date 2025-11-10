"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, File, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  file: File;
  type: "watched" | "ratings" | "diary" | "unknown";
  status: "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

type UploadModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (files: UploadedFile[]) => void;
};

const FILE_TYPES = {
  "watched.csv": "watched",
  "ratings.csv": "ratings",
  "diary.csv": "diary",
} as const;

const FILE_DESCRIPTIONS = {
  watched: {
    label: "Watched Movies",
    description: "Required - Your complete watch list",
    required: true,
  },
  ratings: {
    label: "Ratings",
    description: "Optional - Your movie ratings",
    required: false,
  },
  diary: {
    label: "Diary",
    description: "Optional - Viewing dates and notes",
    required: false,
  },
};

export function UploadModal({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadModalProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => {
        const fileName = file.name.toLowerCase();
        let fileType: UploadedFile["type"] = "unknown";

        for (const [key, type] of Object.entries(FILE_TYPES)) {
          if (fileName === key) {
            fileType = type;
            break;
          }
        }

        return {
          file,
          type: fileType,
          status: "success" as const,
          progress: 100,
          ...(fileType === "unknown" && {
            error: `Unknown file type. Expected: ${Object.keys(FILE_TYPES).join(", ")}`,
            status: "error" as const,
          }),
        };
      });

      setUploadedFiles((prev) => [...prev, ...newFiles]);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: true,
  });

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    const hasWatchedFile = uploadedFiles.some((f) => f.type === "watched");
    const hasErrors = uploadedFiles.some((f) => f.status === "error");

    if (!hasWatchedFile) {
      alert("Please upload at least the 'watched.csv' file");
      return;
    }

    if (hasErrors) {
      alert("Please fix the errors before continuing");
      return;
    }

    onUploadComplete?.(uploadedFiles);
    onOpenChange(false);
  };

  const handleReset = () => {
    setUploadedFiles([]);
  };

  const groupedFiles = uploadedFiles.reduce(
    (acc, file, index) => {
      if (!acc[file.type]) {
        acc[file.type] = [];
      }
      acc[file.type].push({ ...file, index });
      return acc;
    },
    {} as Record<string, (UploadedFile & { index: number })[]>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950 border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">
            Upload Your Letterboxd Data
          </DialogTitle>
          <p className="text-sm text-white/60 mt-2">
            Upload your CSV exports from Letterboxd. The 'watched.csv' file is required.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 transition-all duration-300 cursor-pointer",
              isDragActive
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-3">
              <Upload className="w-8 h-8 text-indigo-400" />
              <div className="text-center">
                <p className="text-white font-medium">
                  {isDragActive ? "Drop files here" : "Drag CSV files here or click to select"}
                </p>
                <p className="text-sm text-white/50 mt-1">
                  Supported: watched.csv, ratings.csv, diary.csv
                </p>
              </div>
            </div>
          </div>

          {/* File Requirements */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">Required & Optional Files:</p>
            <div className="grid md:grid-cols-3 gap-3">
              {Object.entries(FILE_DESCRIPTIONS).map(([key, info]) => {
                const hasFile = uploadedFiles.some((f) => f.type === key);
                return (
                  <div
                    key={key}
                    className={cn(
                      "p-3 rounded-lg border text-sm",
                      hasFile
                        ? "border-green-500/50 bg-green-500/10"
                        : info.required
                        ? "border-red-500/50 bg-red-500/10"
                        : "border-white/10 bg-white/5"
                    )}
                  >
                    <p className="font-medium text-white">{info.label}</p>
                    <p className="text-white/60 text-xs mt-1">{info.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">
                Files ({uploadedFiles.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-white/60 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">
                          {file.file.name}
                        </p>
                        <p className="text-white/50 text-xs">
                          {(file.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="flex-shrink-0 px-2 py-1 rounded text-xs bg-white/10 text-white/70">
                        {file.type}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 ml-3">
                      {file.status === "success" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {file.status === "error" && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-white/60 hover:text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Error Messages */}
              {uploadedFiles.some((f) => f.error) && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">Errors found:</p>
                  {uploadedFiles
                    .filter((f) => f.error)
                    .map((f, i) => (
                      <p key={i} className="text-xs text-red-400/80 mt-1">
                        • {f.file.name}: {f.error}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {uploadedFiles.length > 0 && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Clear All
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={
                uploadedFiles.length === 0 ||
                !uploadedFiles.some((f) => f.type === "watched") ||
                uploadedFiles.some((f) => f.status === "error")
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Continue to Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
