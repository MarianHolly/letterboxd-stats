/*

Diary Area Chart for Analytics Page
- Shows movies watched per month across all time
- Area chart visualization with gradient fill
- Interactive tooltips showing month and movie count
- Smooth line interpolation for better visualization
- Responsive sizing to fit container

Usage:
  <DiaryAreaChart data={monthlyData} />

Data format:
  Array of objects with:
  - month: string (e.g., "2024-01", "Jan 2024")
  - count: number (movies watched in that month)

Example:
  [
    { month: "Jan 2024", count: 5 },
    { month: "Feb 2024", count: 8 },
    { month: "Mar 2024", count: 3 },
    ...
  ]

*/

"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface DiaryAreaChartProps {
  data: Array<{
    month: string;
    count: number;
  }>;
}

const chartConfig = {
  count: {
    label: "Movies",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function DiaryAreaChart({ data }: DiaryAreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Watching Timeline
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-white/60">
            Movies watched per month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-white/50">
            No data available. Upload your diary data to see your timeline.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent">
      <CardHeader>
        <CardTitle className="text-black dark:text-white">
          Watching Timeline
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-white/60">
          Movies watched per month across all time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                left: 12,
                right: 12,
                top: 12,
                bottom: 12,
              }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.1)" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12, fill: "rgba(0,0,0,0.6)" }}
                className="dark:[&_text]:fill-white/70"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12, fill: "rgba(0,0,0,0.6)" }}
                className="dark:[&_text]:fill-white/70"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg"
                    formatter={(value: any) => {
                      return [typeof value === 'number' ? `${value} movies` : value, 'Count'];
                    }}
                  />
                }
                cursor={{ fill: "rgba(0,0,0,0.05)" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--chart-1)"
                fillOpacity={1}
                fill="url(#colorCount)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
