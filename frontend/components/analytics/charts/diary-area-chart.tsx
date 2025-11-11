"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
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

type TimeRange = 'all' | 'last12';
type SmoothingLevel = 'none' | 'two-month' | 'three-month';

const chartConfig = {
  count: {
    label: "Movies",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

/**
 * Aggregates data by grouping consecutive months
 * @param data - Original monthly data
 * @param months - Number of months to group (2 or 3)
 * @returns Aggregated data with labels like "Jan-Feb 2024"
 */
function smoothData(
  data: Array<{ month: string; count: number }>,
  months: number
): Array<{ month: string; count: number }> {
  if (months === 1) return data;

  const smoothed: Array<{ month: string; count: number }> = [];

  for (let i = 0; i < data.length; i += months) {
    const slice = data.slice(i, i + months);
    const totalCount = slice.reduce((sum, item) => sum + item.count, 0);
    const firstMonth = slice[0].month;
    const lastMonth = slice[slice.length - 1].month;

    const label = months > 1 && slice.length > 1
      ? `${firstMonth.split(' ')[0]}-${lastMonth}`
      : firstMonth;

    smoothed.push({
      month: label,
      count: totalCount,
    });
  }

  return smoothed;
}

/**
 * Filters data to show only last N months
 */
function filterLastMonths(
  data: Array<{ month: string; count: number }>,
  months: number
): Array<{ month: string; count: number }> {
  return data.slice(-months);
}

export function DiaryAreaChart({ data }: DiaryAreaChartProps) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('all');
  const [smoothing, setSmoothing] = React.useState<SmoothingLevel>('none');

  // Process data based on selected options
  const processedData = React.useMemo(() => {
    let processed = [...data];

    // Apply time range filter
    if (timeRange === 'last12') {
      processed = filterLastMonths(processed, 12);
    }

    // Apply smoothing
    if (smoothing === 'two-month') {
      processed = smoothData(processed, 2);
    } else if (smoothing === 'three-month') {
      processed = smoothData(processed, 3);
    }

    return processed;
  }, [data, timeRange, smoothing]);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-black dark:text-white">
              Watching Timeline
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-white/60">
              Movies watched {timeRange === 'last12' ? 'in last 12 months' : 'across all time'}
            </CardDescription>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Time Range Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  timeRange === 'all'
                    ? 'bg-slate-200 dark:bg-white/10 text-black dark:text-white'
                    : 'bg-transparent text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setTimeRange('last12')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  timeRange === 'last12'
                    ? 'bg-slate-200 dark:bg-white/10 text-black dark:text-white'
                    : 'bg-transparent text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                Last 12M
              </button>
            </div>

            {/* Smoothing Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setSmoothing('none')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  smoothing === 'none'
                    ? 'bg-slate-200 dark:bg-white/10 text-black dark:text-white'
                    : 'bg-transparent text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Show monthly data"
              >
                Monthly
              </button>
              <button
                onClick={() => setSmoothing('two-month')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  smoothing === 'two-month'
                    ? 'bg-slate-200 dark:bg-white/10 text-black dark:text-white'
                    : 'bg-transparent text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Average every 2 months"
              >
                2M Avg
              </button>
              <button
                onClick={() => setSmoothing('three-month')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  smoothing === 'three-month'
                    ? 'bg-slate-200 dark:bg-white/10 text-black dark:text-white'
                    : 'bg-transparent text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Average every 3 months"
              >
                3M Avg
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={processedData}
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
                type="natural"
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
