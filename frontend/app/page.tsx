"use client";

import { useState } from "react";

interface CastMember {
  name: string;
  character: string;
}

interface Director {
  name: string;
  job: string;
}

interface MovieData {
  title: string;
  year: number | null;
  watched_date: string;
  rating: number | null;
  tmdb_title: string | null;
  tmdb_id: number | null;
  poster: string | null;
  backdrop: string | null;
  overview: string | null;
  tmdb_rating: number | null;
  vote_count: number | null;
  release_date: string | null;
  genres: string[];
  runtime: number | null;
  cast: CastMember[];
  directors: Director[];
  error?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Error: ${response.statusText}`);
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      setMovie(data);
    } catch (err: any) {
      setError(err.message || "Failed to upload file. Please check if the backend is running.");
      console.error("Upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Letterboxd Quick Stats
        </h1>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Upload Your Diary</h2>

          <div className="space-y-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg
                font-semibold hover:bg-blue-700 disabled:bg-gray-400
                disabled:cursor-not-allowed transition"
            >
              {loading ? "Processing..." : "Upload & Analyze"}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {movie && (
          <div className="space-y-6">
            {/* Backdrop */}
            {movie.backdrop && (
              <div className="w-full h-64 rounded-lg overflow-hidden shadow-xl">
                <img
                  src={movie.backdrop}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Main Info Card */}
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-semibold mb-6">
                Most Recent Movie Watched
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Poster */}
                <div>
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full rounded-lg shadow-lg"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">No poster available</span>
                    </div>
                  )}
                </div>

                {/* Main Details */}
                <div className="md:col-span-2 space-y-4">
                  {/* Title & Year */}
                  <div>
                    <h3 className="text-3xl font-bold">{movie.title}</h3>
                    {movie.year && (
                      <p className="text-gray-600 text-lg">{movie.year}</p>
                    )}
                  </div>

                  {/* Ratings */}
                  <div className="flex gap-3 flex-wrap">
                    {movie.rating && (
                      <div className="bg-blue-50 px-4 py-2 rounded-lg">
                        <p className="text-sm text-gray-600">Your Rating</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {movie.rating}★
                        </p>
                      </div>
                    )}
                    {movie.tmdb_rating && (
                      <div className="bg-amber-50 px-4 py-2 rounded-lg">
                        <p className="text-sm text-gray-600">TMDB Rating</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {movie.tmdb_rating.toFixed(1)}★
                        </p>
                        {movie.vote_count && (
                          <p className="text-xs text-gray-500">
                            {movie.vote_count.toLocaleString()} votes
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dates & Runtime */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Watched</p>
                      <p className="font-semibold">{movie.watched_date}</p>
                    </div>
                    {movie.release_date && (
                      <div>
                        <p className="text-sm text-gray-600">Released</p>
                        <p className="font-semibold">
                          {new Date(movie.release_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {movie.runtime && (
                      <div>
                        <p className="text-sm text-gray-600">Runtime</p>
                        <p className="font-semibold">{movie.runtime} min</p>
                      </div>
                    )}
                  </div>

                  {/* Genres */}
                  {movie.genres && movie.genres.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {movie.genres.map((genre) => (
                          <span
                            key={genre}
                            className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Overview */}
              {movie.overview && (
                <div className="mt-8 pt-8 border-t">
                  <p className="text-sm text-gray-600 mb-3 font-semibold">
                    Overview
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    {movie.overview}
                  </p>
                </div>
              )}
            </div>

            {/* Cast & Crew */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Cast */}
              {movie.cast && movie.cast.length > 0 && (
                <div className="bg-white rounded-lg shadow-xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Cast</h3>
                  <div className="space-y-3">
                    {movie.cast.map((member, idx) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-4">
                        <p className="font-semibold text-gray-900">
                          {member.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          as {member.character}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Directors */}
              {movie.directors && movie.directors.length > 0 && (
                <div className="bg-white rounded-lg shadow-xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Directors</h3>
                  <div className="space-y-3">
                    {movie.directors.map((director, idx) => (
                      <div key={idx} className="border-l-4 border-green-500 pl-4">
                        <p className="font-semibold text-gray-900">
                          {director.name}
                        </p>
                        <p className="text-sm text-gray-600">Director</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
