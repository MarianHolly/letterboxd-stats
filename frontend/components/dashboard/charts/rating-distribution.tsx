"use client";

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

interface RatingDistributionProps {
  data: Record<number, number>;
}

export function RatingDistribution({ data }: RatingDistributionProps) {
  // Convert rating distribution to chart data
  const chartData = Array.from({ length: 5 }, (_, i) => {
    const rating = i + 1;
    const count = data[rating] || 0;
    return {
      name: `${rating}★`,
      value: count,
      percentage: 0, // Will be calculated
    };
  });

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  chartData.forEach((d) => {
    d.percentage = total > 0 ? Math.round((d.value / total) * 100) : 0;
  });

  // Color gradient from red to green
  const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

  const totalRatings = total;
  const avgRatingNum =
    chartData.length > 0
      ? chartData.reduce((sum, d, i) => sum + d.value * (i + 1), 0) / total
      : 0;
  const avgRating = avgRatingNum.toFixed(2);

  return (
    <div className="w-full space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
        <div>
          <p className="text-xs text-white/50">Total Ratings</p>
          <p className="text-lg font-bold text-indigo-400">{totalRatings}</p>
        </div>
        <div>
          <p className="text-xs text-white/50">Average Rating</p>
          <p className="text-lg font-bold text-rose-400">{avgRating}★</p>
        </div>
      </div>

      {/* Rating Summary */}
      <div className="space-y-2">
        {chartData.map((item, idx) => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">{item.name}</span>
              <span className="text-white/50">{item.value} movies</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: colors[idx],
                }}
              />
            </div>
          </div>
        ))}
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
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
        <p className="text-sm font-medium text-white">Your Rating Tendency</p>
        {total > 0 && (
          <>
            {chartData[4].value > 0 && chartData[4].percentage >= 30 && (
              <p className="text-xs text-white/60">
                🌟 You're a generous rater! {chartData[4].percentage}% of your ratings are 5★
              </p>
            )}
            {avgRatingNum >= 4 && (
              <p className="text-xs text-white/60">
                😊 You tend to rate movies highly (avg: {avgRating}★)
              </p>
            )}
            {avgRatingNum < 3 && (
              <p className="text-xs text-white/60">
                🎯 You're a critical viewer (avg: {avgRating}★)
              </p>
            )}
            {chartData[0].value > total * 0.2 && (
              <p className="text-xs text-white/60">
                📉 {chartData[0].percentage}% of your ratings are 1★ - you know what you don't like!
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
