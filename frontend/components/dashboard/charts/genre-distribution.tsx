"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GenreDistributionProps {
  data: Record<string, number>;
}

export function GenreDistribution({ data }: GenreDistributionProps) {
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [showTop, setShowTop] = useState<5 | 10 | "all">(5);

  // Convert to chart data and sort
  const chartData = useMemo(() => {
    let items = Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Apply limit
    if (showTop === 5) {
      items = items.slice(0, 5);
    } else if (showTop === 10) {
      items = items.slice(0, 10);
    }

    return items;
  }, [data, showTop]);

  // Colors palette
  const colors = [
    "#4f46e5", // indigo
    "#e11d48", // rose
    "#f59e0b", // amber
    "#10b981", // emerald
    "#06b6d4", // cyan
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
    "#84cc16", // lime
  ];

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const avgGenreMovies = total / chartData.length;

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="space-y-3">
        {/* Chart Type Toggle */}
        <div>
          <label className="text-sm font-medium text-white/70 mb-2 block">
            Chart Type
          </label>
          <div className="flex gap-2">
            {(["pie", "bar"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={chartType === t ? "default" : "outline"}
                onClick={() => setChartType(t)}
                className={cn(
                  chartType === t
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Top N Toggle */}
        <div>
          <label className="text-sm font-medium text-white/70 mb-2 block">
            Show Top
          </label>
          <div className="flex gap-2">
            {([5, 10, "all"] as const).map((n) => (
              <Button
                key={n}
                size="sm"
                variant={showTop === n ? "default" : "outline"}
                onClick={() => setShowTop(n)}
                className={cn(
                  showTop === n
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {n === "all" ? "All" : `Top ${n}`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
        <div>
          <p className="text-xs text-white/50">Unique Genres</p>
          <p className="text-lg font-bold text-indigo-400">
            {Object.keys(data).length}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/50">Top Genre</p>
          <p className="text-lg font-bold text-rose-400">
            {chartData[0]?.name || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/50">Avg per Genre</p>
          <p className="text-lg font-bold text-amber-400">
            {Math.round(avgGenreMovies)}
          </p>
        </div>
      </div>

      {/* Genre List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {chartData.map((item, idx) => (
          <div key={item.name} className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[idx % colors.length] }}
              />
              <span className="text-white font-medium">{item.name}</span>
            </div>
            <div className="text-right">
              <span className="text-white/70 text-sm">{item.value}</span>
              <span className="text-white/40 text-xs ml-2">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full h-96 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "pie" ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
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
              />
            </PieChart>
          ) : (
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                type="number"
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "12px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "white" }}
                formatter={(value) => [
                  `${value} movies`,
                  "Count",
                ]}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
        <p className="text-sm font-medium text-white">Your Genre Taste</p>
        <p className="text-xs text-white/60">
          🎬 {chartData[0]?.name} is your favorite genre with {chartData[0]?.value} movies
        </p>
        {chartData.length > 1 && (
          <p className="text-xs text-white/60">
            🎭 You enjoy {chartData.length} different genres
          </p>
        )}
      </div>
    </div>
  );
}
