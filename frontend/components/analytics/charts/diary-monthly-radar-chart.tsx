/*

Diary Monthly Radar Chart for Analytics Page
- Shows monthly viewing patterns across fully recorded years
- Radar/Polar chart visualization with multiple year series
- Each complete year displays as one radar chart
- Months (Jan-Dec) as data points around the radar
- Shows which months user watches most movies
- Interactive tooltips with month name and movie count
- Color-coded by year with legend
- Smoothing options: monthly, 2-month average, 3-month average
- Circular grid without radial lines

Usage:
  <DiaryMonthlyRadarChart data={yearlyMonthlyData} />

Data format:
  Array of objects, one per fully recorded year:
  - year: number (e.g., 2024)
  - data: Array of month data
    - month: string (Jan, Feb, etc.)
    - count: number (movies watched in that month)

*/

"use client"

import * as React from "react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Dot,
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

interface MonthData {
  month: string;
  count: number;
}

interface YearData {
  year: number;
  data: MonthData[];
}

interface DiaryMonthlyRadarChartProps {
  data: YearData[];
}

type SmoothingLevel = 'none' | 'two-month' | 'three-month';

// Color palette for different years
const yearColors = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
]

/**
 * Averages data across consecutive months
 * @param data - Monthly data
 * @param months - Number of months to average (2 or 3)
 * @returns Averaged data
 */
function smoothRadarData(
  data: MonthData[],
  months: number
): MonthData[] {
  if (months === 1) return data;

  const smoothed: MonthData[] = [];

  for (let i = 0; i < data.length; i += months) {
    const slice = data.slice(i, i + months);
    const totalCount = slice.reduce((sum, item) => sum + item.count, 0);
    const avgCount = Math.round(totalCount / slice.length);

    // Create label from month range (e.g., "Jan-Feb", "Mar-Apr-May")
    const monthLabels = slice.map(item => item.month.split(' ')[0]); // Get just month name
    const label = monthLabels.length > 1
      ? monthLabels.join('-')
      : monthLabels[0];

    smoothed.push({
      month: label,
      count: avgCount,
    });
  }

  return smoothed;
}

export function DiaryMonthlyRadarChart({ data }: DiaryMonthlyRadarChartProps) {
  const [smoothing, setSmoothing] = React.useState<SmoothingLevel>('none');

  // Apply smoothing to all years - must be before early return
  const smoothedData = React.useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    return data.map(yearData => ({
      ...yearData,
      data: smoothRadarData(
        yearData.data,
        smoothing === 'two-month' ? 2 : smoothing === 'three-month' ? 3 : 1
      ),
    }));
  }, [data, smoothing]);

  if (!data || data.length === 0) {
    return (
      <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Monthly Patterns by Year
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-white/60">
            Which months you watch the most movies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-slate-500 dark:text-white/50">
            <div className="text-center">
              <p className="mb-2">No data available for radar analysis.</p>
              <p className="text-xs">
                At least one fully recorded year is needed to display monthly patterns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find the maximum count across all data for better scaling
  const maxCount = Math.max(
    ...smoothedData.flatMap(year => year.data.map(month => month.count))
  )

  // Transform data for radar chart display
  const radarData = smoothedData.length === 1
    ? smoothedData[0].data
    : smoothedData[0].data.map((item, idx) => {
        const point: Record<string, string | number> = {
          month: item.month,
        }
        smoothedData.forEach(yearData => {
          point[`year${yearData.year}`] = yearData.data[idx]?.count || 0
        })
        return point
      })

  return (
    <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent">
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div>
            <CardTitle className="text-black dark:text-white">
              Monthly Patterns by Year
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-white/60">
              {smoothedData.length === 1
                ? `Viewing patterns for ${smoothedData[0].year}`
                : `Viewing patterns for ${smoothedData.length} years`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {smoothedData.length === 1 ? (
          // Single year radar
          <ChartContainer
            config={{}}
            className="aspect-square h-[400px] w-full max-w-md mx-auto"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid
                  stroke="rgba(0,0,0,0.12)"
                  fill="rgba(0,0,0,0.02)"
                  strokeDasharray="0"
                  radialLines={false}
                  gridType="circle"
                  className="dark:[&_circle]:stroke-white/15 dark:fill-white/[0.02]"
                />
                <PolarAngleAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "rgba(0,0,0,0.6)" }}
                  className="dark:[&_text]:fill-white/70"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, Math.ceil(maxCount * 1.2)]}
                  tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }}
                  className="dark:[&_text]:fill-white/60"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg"
                      formatter={(value: any) => {
                        return [typeof value === 'number' ? `${value} movies` : value, ''];
                      }}
                    />
                  }
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                />
                <Radar
                  name={`${smoothedData[0].year}`}
                  dataKey="count"
                  stroke={yearColors[0]}
                  fill={yearColors[0]}
                  fillOpacity={0.6}
                  isAnimationActive={false}
                  dot={{ r: 4, fill: yearColors[0] }}
                  activeDot={{ r: 6 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          // Multiple years radar
          <ChartContainer
            config={{}}
            className="aspect-square h-[400px] w-full max-w-md mx-auto"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid
                  stroke="rgba(0,0,0,0.12)"
                  fill="rgba(0,0,0,0.02)"
                  strokeDasharray="0"
                  radialLines={false}
                  gridType="circle"
                  className="dark:[&_circle]:stroke-white/15 dark:fill-white/[0.02]"
                />
                <PolarAngleAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "rgba(0,0,0,0.6)" }}
                  className="dark:[&_text]:fill-white/70"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, Math.ceil(maxCount * 1.2)]}
                  tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }}
                  className="dark:[&_text]:fill-white/60"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg"
                      formatter={(value: any) => {
                        return [typeof value === 'number' ? `${value} movies` : value, ''];
                      }}
                    />
                  }
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                />
                {smoothedData.map((yearData, index) => (
                  <Radar
                    key={`radar-${yearData.year}`}
                    name={`${yearData.year}`}
                    dataKey={`year${yearData.year}`}
                    stroke={yearColors[index % yearColors.length]}
                    fill={yearColors[index % yearColors.length]}
                    fillOpacity={0.35}
                    isAnimationActive={false}
                    dot={{ r: 3, fill: yearColors[index % yearColors.length] }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Controls Below Chart */}
        <div className="flex flex-col gap-4 pt-6 border-t border-slate-200 dark:border-white/10">
          {/* Smoothing Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSmoothing('none')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
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
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
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
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                smoothing === 'three-month'
                  ? 'bg-slate-200 dark:bg-white/10 text-black dark:text-white'
                  : 'bg-transparent text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              title="Average every 3 months"
            >
              3M Avg
            </button>
          </div>

          {/* Year Legend */}
          <div className="flex flex-wrap gap-3">
            {smoothedData.map((yearData, index) => (
              <div key={yearData.year} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: yearColors[index % yearColors.length] }}
                />
                <span className="text-xs font-medium text-slate-700 dark:text-white/80">
                  {yearData.year}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
