/*

Diary Monthly Radar Chart for Analytics Page
- Shows monthly viewing patterns across fully recorded years
- Radar/Polar chart visualization with multiple year series
- Each complete year displays as one radar chart
- Months (Jan-Dec) as data points around the radar
- Shows which months user watches most movies
- Interactive tooltips with month name and movie count
- Color-coded by year for easy comparison

Usage:
  <DiaryMonthlyRadarChart data={yearlyMonthlyData} />

Data format:
  Array of objects, one per fully recorded year:
  - year: number (e.g., 2024)
  - data: Array of month data
    - month: string (Jan, Feb, etc.) or number (1-12)
    - count: number (movies watched in that month)

Example:
  [
    {
      year: 2023,
      data: [
        { month: "Jan", count: 5 },
        { month: "Feb", count: 8 },
        { month: "Mar", count: 3 },
        ...
        { month: "Dec", count: 6 }
      ]
    },
    {
      year: 2024,
      data: [
        { month: "Jan", count: 7 },
        { month: "Feb", count: 4 },
        ...
      ]
    }
  ]

Notes:
- Only fully recorded years (with data for all 12 months) should be included
- Months should be in chronological order (Jan-Dec)
- Colors are automatically assigned to each year
- Maximum recommended: 5-6 years for clarity

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

// Color palette for different years
const yearColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
]

export function DiaryMonthlyRadarChart({ data }: DiaryMonthlyRadarChartProps) {
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
    ...data.flatMap(year => year.data.map(month => month.count))
  )

  // Prepare chart config based on number of years
  const chartConfig = data.reduce(
    (acc, yearData, index) => {
      acc[`year${yearData.year}`] = {
        label: `${yearData.year}`,
        color: yearColors[index % yearColors.length],
      }
      return acc
    },
    {} as Record<string, { label: string; color: string }>
  )

  // Transform data for radar chart display
  const radarData = data.length === 1
    ? data[0].data.map((item, idx) => ({
        month: item.month,
        count: item.count,
      }))
    : data[0].data.map((item, idx) => {
        const point: Record<string, string | number> = {
          month: item.month,
        }
        data.forEach(yearData => {
          point[`year${yearData.year}`] = yearData.data[idx]?.count || 0
        })
        return point
      })

  return (
    <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent">
      <CardHeader>
        <CardTitle className="text-black dark:text-white">
          Monthly Patterns by Year
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-white/60">
          {data.length === 1
            ? `Viewing patterns for ${data[0].year}`
            : `Viewing patterns for ${data.length} years`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 1 ? (
          // Single year radar
          <ChartContainer
            config={chartConfig}
            className="aspect-square h-[400px] w-full max-w-md mx-auto"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid
                  stroke="rgba(0,0,0,0.1)"
                  className="dark:[&_circle]:stroke-white/10"
                />
                <PolarAngleAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "rgba(0,0,0,0.6)" }}
                  className="dark:[&_text]:fill-white/70"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, Math.ceil(maxCount * 1.2)]}
                  tick={{ fontSize: 12, fill: "rgba(0,0,0,0.6)" }}
                  className="dark:[&_text]:fill-white/70"
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
                  name={`${data[0].year}`}
                  dataKey="count"
                  stroke={yearColors[0]}
                  fill={yearColors[0]}
                  fillOpacity={0.6}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          // Multiple years radar
          <ChartContainer
            config={chartConfig}
            className="aspect-square h-[400px] w-full max-w-md mx-auto"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid
                  stroke="rgba(0,0,0,0.1)"
                  className="dark:[&_circle]:stroke-white/10"
                />
                <PolarAngleAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "rgba(0,0,0,0.6)" }}
                  className="dark:[&_text]:fill-white/70"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, Math.ceil(maxCount * 1.2)]}
                  tick={{ fontSize: 12, fill: "rgba(0,0,0,0.6)" }}
                  className="dark:[&_text]:fill-white/70"
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
                {data.map((yearData, index) => (
                  <Radar
                    key={`radar-${yearData.year}`}
                    name={`${yearData.year}`}
                    dataKey={`year${yearData.year}`}
                    stroke={yearColors[index % yearColors.length]}
                    fill={yearColors[index % yearColors.length]}
                    fillOpacity={0.35}
                    isAnimationActive={false}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
