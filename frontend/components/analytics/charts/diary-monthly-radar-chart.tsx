/*

Diary Monthly Radar Chart for Analytics Page
- Shows monthly viewing patterns across fully recorded years
- Radar/Polar chart visualization with multiple year series
- Each complete year displays as one radar chart
- Months (Jan-Dec) as data points around the radar
- Shows which months user watches most movies
- Interactive tooltips with month/season name, movie count, and year
- Color-coded by year with interactive legend (click to toggle visibility)
- Smoothing options: monthly, 2-month average, seasonal (quarterly)
- Hover highlighting to focus on specific months/seasons
- Radial grid lines in large mode for easier value reading
- Prevents hiding all years (always keeps at least one visible)

Usage:
  <DiaryMonthlyRadarChart data={yearlyMonthlyData} />
  <DiaryMonthlyRadarChart data={yearlyMonthlyData} size="large" />

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
  size?: 'compact' | 'large';
}

type SmoothingLevel = 'none' | 'two-month' | 'seasonal';

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
 * Custom tooltip that displays year with movie count
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
  }>;
  label?: string;
}

function CustomRadarTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded shadow-lg p-3">
      <p className="font-medium text-sm text-slate-900 dark:text-white mb-2">
        {label}
      </p>
      {payload.map((entry, index) => {
        // Extract year from dataKey (e.g., "year2023" -> "2023")
        const year = entry.dataKey.replace('year', '') || entry.name;
        return (
          <p key={index} className="text-xs text-slate-700 dark:text-white/80">
            <span style={{ color: entry.color || 'inherit' }}>●</span> {year}: {entry.value} {entry.value === 1 ? 'movie' : 'movies'}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Averages data across consecutive months or groups by season
 * @param data - Monthly data
 * @param mode - 'none' for raw data, 'two-month' for 2-month average, 'seasonal' for quarterly
 * @returns Transformed data
 */
function smoothRadarData(
  data: MonthData[],
  mode: 'none' | 'two-month' | 'seasonal'
): MonthData[] {
  if (mode === 'none') return data;

  const seasonMap = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];

  if (mode === 'seasonal') {
    const seasonal: MonthData[] = [];

    for (let q = 0; q < 4; q++) {
      const slice = data.slice(q * 3, (q + 1) * 3);
      if (slice.length === 0) continue;

      const totalCount = slice.reduce((sum, item) => sum + item.count, 0);
      const avgCount = Math.round(totalCount / slice.length);

      seasonal.push({
        month: seasonMap[q],
        count: avgCount,
      });
    }

    return seasonal;
  }

  // Two-month average
  const smoothed: MonthData[] = [];

  for (let i = 0; i < data.length; i += 2) {
    const slice = data.slice(i, i + 2);
    const totalCount = slice.reduce((sum, item) => sum + item.count, 0);
    const avgCount = Math.round(totalCount / slice.length);

    const monthLabels = slice.map(item => item.month.split(' ')[0]);
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

export function DiaryMonthlyRadarChart({ data, size = 'compact' }: DiaryMonthlyRadarChartProps) {
  const [smoothing, setSmoothing] = React.useState<SmoothingLevel>('none');
  const [hiddenYears, setHiddenYears] = React.useState<Set<number>>(new Set());
  const [highlightedMonth, setHighlightedMonth] = React.useState<string | null>(null);
  const chartHeight = size === 'large' ? 'h-[600px]' : 'h-[400px]';
  const isLarge = size === 'large';

  const toggleYear = (year: number) => {
    const newHidden = new Set(hiddenYears);
    if (newHidden.has(year)) {
      newHidden.delete(year);
    } else {
      // Prevent hiding all years - keep at least one visible
      if (newHidden.size >= (data?.length ?? 0) - 1) {
        return;
      }
      newHidden.add(year);
    }
    setHiddenYears(newHidden);
  };

  // Apply smoothing to all years - must be before early return
  const smoothedData = React.useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    return data
      .filter(yearData => !hiddenYears.has(yearData.year))
      .map(yearData => ({
        ...yearData,
        data: smoothRadarData(
          yearData.data,
          smoothing
        ),
      }));
  }, [data, smoothing, hiddenYears]);

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

  // Create a mapping of original year index to smoothedData index for consistent coloring

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
            className={`aspect-square ${chartHeight} w-full ${size === 'large' ? 'max-w-2xl' : 'max-w-md'} mx-auto`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={radarData}
                onMouseMove={(state: any) => {
                  if (state?.activeTooltipIndex !== undefined && radarData[state.activeTooltipIndex]) {
                    const monthValue = radarData[state.activeTooltipIndex].month;
                    setHighlightedMonth(typeof monthValue === 'string' ? monthValue : null);
                  }
                }}
                onMouseLeave={() => setHighlightedMonth(null)}
              >
                <PolarGrid
                  stroke="rgba(0,0,0,0.12)"
                  fill="rgba(0,0,0,0.02)"
                  strokeDasharray="0"
                  radialLines={isLarge}
                  gridType="circle"
                  className="dark:[&_circle]:stroke-white/15 dark:fill-white/[0.02]"
                />
                <PolarAngleAxis
                  dataKey="month"
                  tick={{ fontSize: isLarge ? 14 : 12, fill: "rgba(0,0,0,0.6)" }}
                  className="dark:[&_text]:fill-white/70"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, Math.ceil(maxCount * 1.2)]}
                  tick={{ fontSize: isLarge ? 13 : 11, fill: "rgba(0,0,0,0.5)" }}
                  className="dark:[&_text]:fill-white/60"
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded shadow-lg p-3">
                        <p className="font-medium text-sm text-slate-900 dark:text-white mb-2">
                          {label}
                        </p>
                        <p className="text-xs text-slate-700 dark:text-white/80">
                          <span style={{ color: yearColors[0] }}>●</span> {smoothedData[0]?.year}: {payload[0]?.value} {payload[0]?.value === 1 ? 'movie' : 'movies'}
                        </p>
                      </div>
                    );
                  }}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                />
                <Radar
                  name={`${smoothedData[0].year}`}
                  dataKey="count"
                  stroke={yearColors[0]}
                  fill={yearColors[0]}
                  fillOpacity={0.6}
                  isAnimationActive={false}
                  dot={{ r: isLarge ? 5 : 4, fill: yearColors[0] }}
                  activeDot={{ r: isLarge ? 8 : 6 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          // Multiple years radar
          <ChartContainer
            config={{}}
            className={`aspect-square ${chartHeight} w-full ${size === 'large' ? 'max-w-2xl' : 'max-w-md'} mx-auto`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={radarData}
                onMouseMove={(state: any) => {
                  if (state?.activeTooltipIndex !== undefined && radarData[state.activeTooltipIndex]) {
                    const monthValue = radarData[state.activeTooltipIndex].month;
                    setHighlightedMonth(typeof monthValue === 'string' ? monthValue : null);
                  }
                }}
                onMouseLeave={() => setHighlightedMonth(null)}
              >
                <PolarGrid
                  stroke="rgba(0,0,0,0.12)"
                  fill="rgba(0,0,0,0.02)"
                  strokeDasharray="0"
                  radialLines={isLarge}
                  gridType="circle"
                  className="dark:[&_circle]:stroke-white/15 dark:fill-white/[0.02]"
                />
                <PolarAngleAxis
                  dataKey="month"
                  tick={{ fontSize: isLarge ? 14 : 12, fill: "rgba(0,0,0,0.6)" }}
                  className="dark:[&_text]:fill-white/70"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, Math.ceil(maxCount * 1.2)]}
                  tick={{ fontSize: isLarge ? 13 : 11, fill: "rgba(0,0,0,0.5)" }}
                  className="dark:[&_text]:fill-white/60"
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded shadow-lg p-3">
                        <p className="font-medium text-sm text-slate-900 dark:text-white mb-2">
                          {label}
                        </p>
                        {payload.map((entry, index) => {
                          const dataKey = entry.dataKey as string | undefined;
                          const year = dataKey?.replace('year', '') || entry.name;
                          const dataKeyIndex = smoothedData.findIndex(y => `year${y.year}` === dataKey);
                          const color = dataKeyIndex >= 0 ? yearColors[dataKeyIndex % yearColors.length] : 'inherit';
                          return (
                            <p key={index} className="text-xs text-slate-700 dark:text-white/80">
                              <span style={{ color }}>●</span> {year}: {entry.value} {entry.value === 1 ? 'movie' : 'movies'}
                            </p>
                          );
                        })}
                      </div>
                    );
                  }}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                />
                {smoothedData.map((yearData, index) => {
                  const color = yearColors[index % yearColors.length];
                  return (
                    <Radar
                      key={`radar-${yearData.year}`}
                      name={`${yearData.year}`}
                      dataKey={`year${yearData.year}`}
                      stroke={color}
                      fill={color}
                      fillOpacity={highlightedMonth ? 0.15 : 0.35}
                      isAnimationActive={false}
                      dot={{ r: isLarge ? 4 : 3, fill: color }}
                      activeDot={{ r: isLarge ? 7 : 5 }}
                    />
                  );
                })}
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
              onClick={() => setSmoothing('seasonal')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                smoothing === 'seasonal'
                  ? 'bg-slate-200 dark:bg-white/10 text-black dark:text-white'
                  : 'bg-transparent text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              title="View by quarters (Q1-Q4)"
            >
              Seasonal
            </button>
          </div>

          {/* Year Legend */}
          <div className="flex flex-wrap gap-3">
            {data.map((yearData, dataIndex) => {
              const isHidden = hiddenYears.has(yearData.year);
              return (
                <button
                  key={yearData.year}
                  onClick={() => toggleYear(yearData.year)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded transition-all ${
                    isHidden
                      ? 'bg-slate-100 dark:bg-white/5 opacity-50'
                      : 'hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title={isHidden ? `Click to show ${yearData.year}` : `Click to hide ${yearData.year}`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-opacity ${
                      isHidden ? 'opacity-50' : 'opacity-100'
                    }`}
                    style={{ backgroundColor: yearColors[dataIndex % yearColors.length] }}
                  />
                  <span className={`text-xs font-medium transition-opacity ${
                    isHidden
                      ? 'text-slate-500 dark:text-white/40'
                      : 'text-slate-700 dark:text-white/80'
                  }`}>
                    {yearData.year}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
