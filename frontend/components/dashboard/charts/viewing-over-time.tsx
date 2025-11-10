"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

type TimeGranularity = "yearly" | "monthly" | "weekly";
type TimeRange = "all" | "3years" | "12months";

interface ViewingOverTimeProps {
  data: Record<string, number>;
}

export function ViewingOverTime({ data }: ViewingOverTimeProps) {
  const [granularity, setGranularity] = useState<TimeGranularity>("monthly");
  const [range, setRange] = useState<TimeRange>("all");
  const [chartType, setChartType] = useState<"area" | "bar" | "line">("area");

  // Process data based on selected granularity and range
  const chartData = useMemo(() => {
    const entries = Object.entries(data).sort();

    // Filter by range
    let filtered = entries;
    if (range === "12months") {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      filtered = entries.filter(([date]) => {
        const d = new Date(date);
        return d >= oneYearAgo;
      });
    } else if (range === "3years") {
      const now = new Date();
      const threeYearsAgo = new Date(
        now.getFullYear() - 3,
        now.getMonth(),
        now.getDate()
      );
      filtered = entries.filter(([date]) => {
        const d = new Date(date);
        return d >= threeYearsAgo;
      });
    }

    // Aggregate by granularity
    if (granularity === "yearly") {
      const yearlyData: Record<string, number> = {};
      filtered.forEach(([date, count]) => {
        const year = date.slice(0, 4);
        yearlyData[year] = (yearlyData[year] || 0) + count;
      });
      return Object.entries(yearlyData).map(([year, count]) => ({
        name: year,
        value: count,
        date: year,
      }));
    }

    if (granularity === "weekly") {
      const weeklyData: Record<string, number> = {};
      filtered.forEach(([date, count]) => {
        const d = new Date(date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + count;
      });
      return Object.entries(weeklyData)
        .sort()
        .map(([week, count]) => ({
          name: week,
          value: count,
          date: week,
        }));
    }

    // Monthly (default)
    return filtered.map(([date, count]) => ({
      name: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      value: count,
      date,
    }));
  }, [data, granularity, range]);

  // Calculate cumulative for area chart
  const cumulativeData = useMemo(() => {
    let cumulative = 0;
    return chartData.map((item) => {
      cumulative += item.value;
      return { ...item, cumulative };
    });
  }, [chartData]);

  const displayData = chartType === "area" ? cumulativeData : chartData;

  const maxValue =
    displayData.length > 0
      ? Math.max(
          ...displayData.map((d) => {
            if (chartType === "area") {
              return (d as any).cumulative || 0;
            }
            return d.value || 0;
          })
        )
      : 0;
  const avgValue =
    displayData.length > 0
      ? displayData.reduce((sum, d) => sum + (d.value || 0), 0) / displayData.length
      : 0;

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="space-y-3">
        {/* Granularity Toggle */}
        <div>
          <label className="text-sm font-medium text-white/70 mb-2 block">
            Time Granularity
          </label>
          <div className="flex gap-2 flex-wrap">
            {(["yearly", "monthly", "weekly"] as const).map((g) => (
              <Button
                key={g}
                size="sm"
                variant={granularity === g ? "default" : "outline"}
                onClick={() => setGranularity(g)}
                className={
                  granularity === g
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-indigo-400/60 text-indigo-200 hover:bg-indigo-600/20 hover:text-indigo-100 hover:border-indigo-400"
                }
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Range Toggle */}
        <div>
          <label className="text-sm font-medium text-white/70 mb-2 block">
            Time Range
          </label>
          <div className="flex gap-2 flex-wrap">
            {(["all", "3years", "12months"] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "outline"}
                onClick={() => setRange(r)}
                className={
                  range === r
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-indigo-400/60 text-indigo-200 hover:bg-indigo-600/20 hover:text-indigo-100 hover:border-indigo-400"
                }
              >
                {r === "all"
                  ? "All Time"
                  : r === "3years"
                  ? "Last 3 Years"
                  : "Last 12 Months"}
              </Button>
            ))}
          </div>
        </div>

        {/* Chart Type Toggle */}
        <div>
          <label className="text-sm font-medium text-white/70 mb-2 block">
            Chart Type
          </label>
          <div className="flex gap-2 flex-wrap">
            {(["area", "bar", "line"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={chartType === t ? "default" : "outline"}
                onClick={() => setChartType(t)}
                className={
                  chartType === t
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-indigo-400/60 text-indigo-200 hover:bg-indigo-600/20 hover:text-indigo-100 hover:border-indigo-400"
                }
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
        <div>
          <p className="text-xs text-white/50">Peak Month</p>
          <p className="text-lg font-bold text-indigo-400">
            {displayData && displayData.length > 0
              ? displayData.reduce((max, d) => (d.value > max.value ? d : max)).value
              : 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/50">Average</p>
          <p className="text-lg font-bold text-rose-400">
            {Math.round(avgValue)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-96 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={displayData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="name"
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "white" }}
                formatter={(value) => [`${value} movies`, "Count"]}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#4f46e5"
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          ) : chartType === "bar" ? (
            <BarChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="name"
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "white" }}
                formatter={(value) => [`${value} movies`, "Count"]}
              />
              <Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="name"
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "white" }}
                formatter={(value) => [`${value} movies`, "Count"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4f46e5"
                dot={{ fill: "#4f46e5" }}
                strokeWidth={2}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Info */}
      <p className="text-xs text-white/40">
        {chartType === "area"
          ? "Area chart shows cumulative movies watched over time"
          : chartType === "bar"
          ? "Bar chart shows movies watched per period"
          : "Line chart shows trend of movies watched over time"}
      </p>
    </div>
  );
}
