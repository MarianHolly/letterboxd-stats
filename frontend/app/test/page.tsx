"use client";

import React, { useState, useEffect } from "react";
import { useUploadStore } from "@/hooks/use-upload-store";
import Papa from "papaparse";

interface CsvData {
  headers: string[];
  rows: Array<Record<string, string>>;
  rowCount: number;
}

// useAnalytic
 
export default function TestPage() {
  const files = useUploadStore((state) => state.files);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<CsvData | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const watchedFile = files.find((f) => f.type === "watched");

  // Parse selected file
  useEffect(() => {
    if (selectedFile) {
      const file = files.find((f) => f.id === selectedFile);
      if (file && file.data) {
        Papa.parse(file.data, {
          header: true,
          complete: (results: any) => {
            setParsedData({
              headers: results.meta.fields || [],
              rows: results.data.filter((row: any) => Object.values(row).some((v) => v)),
              rowCount: results.data.filter((row: any) =>
                Object.values(row).some((v) => v)
              ).length,
            });
          },
        });
      }
    }
  }, [selectedFile, files]);



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Data Explorer</h1>
          <p className="text-slate-400">
            View and analyze your imported Letterboxd data
          </p>
        </div>

        {/* Quick Stats */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="text-slate-400 text-sm font-medium mb-2">
                Total Movies
              </div>
              <div className="text-3xl font-bold text-white">
                {analytics.totalMovies || 0}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="text-slate-400 text-sm font-medium mb-2">
                Average Rating
              </div>
              <div className="text-3xl font-bold text-yellow-400">
                {(analytics.averageRating || 0).toFixed(2)}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="text-slate-400 text-sm font-medium mb-2">
                Total Hours
              </div>
              <div className="text-3xl font-bold text-blue-400">
                {Math.round(analytics.totalHoursWatched || 0)}h
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="text-slate-400 text-sm font-medium mb-2">
                Tracking Days
              </div>
              <div className="text-3xl font-bold text-green-400">
                {analytics.totalDaysTracking || 0}
              </div>
            </div>
          </div>
        )}

        {/* Files Section */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Uploaded Files</h2>
          {files.length === 0 ? (
            <p className="text-slate-400">
              No files uploaded yet. Go to the upload page to import your
              Letterboxd data.
            </p>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFile(file.id)}
                  className={`w-full text-left p-4 rounded border transition-all ${
                    selectedFile === file.id
                      ? "bg-blue-900 border-blue-500"
                      : "bg-slate-700 border-slate-600 hover:border-slate-500"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white">{file.name}</div>
                      <div className="text-sm text-slate-400">
                        Type: {file.type} • Size:{" "}
                        {(file.size / 1024).toFixed(2)} KB • Uploaded:{" "}
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Data Preview */}
        {selectedFile && parsedData && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Data Preview ({parsedData.rowCount} records)
              </h2>
              <div className="text-sm text-slate-400">
                Columns: {parsedData.headers.length}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    {parsedData.headers.map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left font-semibold text-slate-300 bg-slate-900"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.rows.slice(0, 10).map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-700 hover:bg-slate-700 transition"
                    >
                      {parsedData.headers.map((header) => (
                        <td
                          key={`${idx}-${header}`}
                          className="px-4 py-3 text-slate-300 truncate max-w-xs"
                          title={row[header] || ""}
                        >
                          {row[header] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedData.rowCount > 10 && (
              <div className="mt-4 text-sm text-slate-400 text-center">
                Showing 10 of {parsedData.rowCount} records
              </div>
            )}
          </div>
        )}

        {/* Statistics Details */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Genre Distribution */}
            {analytics.genreDistribution &&
              Object.keys(analytics.genreDistribution).length > 0 && (
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Top Genres
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.genreDistribution)
                      .sort((a: any, b: any) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([genre, count]: [string, any]) => (
                        <div
                          key={genre}
                          className="flex justify-between items-center"
                        >
                          <span className="text-slate-300">{genre}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{
                                  width: `${(count / Math.max(...Object.values(analytics.genreDistribution) as number[])) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-slate-400 text-sm w-8 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Rating Distribution */}
            {analytics.ratingDistribution &&
              Object.keys(analytics.ratingDistribution).length > 0 && (
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Rating Distribution
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.ratingDistribution)
                      .sort((a: any, b: any) => Number(b[0]) - Number(a[0]))
                      .map(([rating, count]: [string, any]) => (
                        <div
                          key={rating}
                          className="flex justify-between items-center"
                        >
                          <span className="text-slate-300">★ {rating}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full"
                                style={{
                                  width: `${(count / Math.max(...Object.values(analytics.ratingDistribution) as number[])) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-slate-400 text-sm w-8 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Empty State */}
        {files.length === 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <h3 className="text-xl font-bold text-white mb-2">
              No Data to Display
            </h3>
            <p className="text-slate-400 mb-4">
              Upload your Letterboxd CSV files to see data insights here.
            </p>
            <a
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded transition"
            >
              Go to Upload
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
