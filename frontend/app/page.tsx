"use client";

import { useState } from "react";

interface MovieData {
  title: string;
  year: number;
  watched_date: string;
  rating: number | null;
  tmdb_title: string;
  poster: string | null;
  overview: string;
  tmdb_rating: number;
  release_date: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black"></div>
  );
}
