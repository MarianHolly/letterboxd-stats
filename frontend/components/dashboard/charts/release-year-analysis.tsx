"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReleaseYearAnalysisProps {
  data: Record<string, number>;
}

type EraFilter = "all" | "pre1960" | "1960-1999" | "2000-now";

export function ReleaseYearAnalysis({ data }: ReleaseYearAnalysisProps) {
  const [eraFilter, setEraFilter] = useState<EraFilter>("all");

  // Process data by year with era filtering
  const chartData = useMemo(() => {
    const entries = Object.entries(data)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);

    // Filter by era
    let filtered = entries;
    if (eraFilter === "pre1960") {
      filtered = entries.filter((e) => e.year < 1960);
    } else if (eraFilter === "1960-1999") {
      filtered = entries.filter((e) => e.year >= 1960 && e.year < 2000);
    } else if (eraFilter === "2000-now") {
      filtered = entries.filter((e) => e.year >= 2000);
    }

    return filtered.map(({ year, count }) => ({
      name: year.toString(),
      value: count,
      year,
    }));
  }, [data, eraFilter]);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const avgMoviesPerYear = (total / chartData.length).toFixed(1);

  // Find the most watched year
  const mostWatched =
    chartData && chartData.length > 0
      ? chartData.reduce((max, d) => (d.value > max.value ? d : max))
      : null;

  // Color gradient based on year
  const getColor = (year: number) => {
    if (year < 1960) return "#7c3aed"; // violet
    if (year < 1980) return "#3b82f6"; // blue
    if (year < 2000) return "#10b981"; // emerald
    if (year < 2010) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  return (
    <div className="w-full space-y-4">
      {/* Era Filter Buttons */}
      <div>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { value: "all", label: "Full Timeline" },
              { value: "pre1960", label: "Before 1960" },
              { value: "1960-1999", label: "1960-1999" },
              { value: "2000-now", label: "2000-Now" },
            ] as const
          ).map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={eraFilter === value ? "default" : "outline"}
              onClick={() => setEraFilter(value)}
              className={
                eraFilter === value
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "border-indigo-400/60 text-indigo-200 hover:bg-indigo-600/20 hover:text-indigo-100 hover:border-indigo-400"
              }
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
        <div>
          <p className="text-xs text-white/50">Peak Year</p>
          <p className="text-lg font-bold text-indigo-400">{mostWatched?.name}</p>
          <p className="text-xs text-white/40">{mostWatched?.value} movies</p>
        </div>
        <div>
          <p className="text-xs text-white/50">Average per Year</p>
          <p className="text-lg font-bold text-rose-400">{avgMoviesPerYear}</p>
        </div>
      </div>

      {/* Year List */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {chartData.map((item) => {
          const percentage = ((item.value / total) * 100).toFixed(0);
          return (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <span className="text-white/70 min-w-16">{item.name}</span>
              <div className="flex-1 mx-3">
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getColor(item.year),
                    }}
                  />
                </div>
              </div>
              <div className="text-right min-w-16">
                <p className="text-white/70">{item.value}</p>
                <p className="text-white/40 text-xs">{percentage}%</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="w-full h-80 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="name"
              stroke="rgba(255,255,255,0.5)"
              style={{ fontSize: "12px" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "white" }}
              formatter={(value) => [
                `${value} movies (${Math.round((value as number / total) * 100)}%)`,
                "Count",
              ]}
              cursor={{ fill: "rgba(79, 70, 229, 0.1)" }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.year)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
