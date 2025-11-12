/*

Diary Statistics Component for Analytics Page
- Displays text-based statistics about user's watching habits
- Shows key metrics: total diary entries, average movies per month, busiest month, etc.
- Grid layout for organized display
- Dark mode support
- Responsive design for mobile and desktop

Usage:
  <DiaryStatistics stats={diaryStats} />

Data format:
  Object with statistics:
  - totalEntries: number (total diary entries)
  - averagePerMonth: number
  - busiestMonth: string (month with most entries)
  - busiestMonthCount: number
  - quietestMonth: string (month with least entries)
  - quietestMonthCount: number
  - dateRange: string (e.g., "Jan 2020 - Nov 2024")

Example:
  {
    totalEntries: 156,
    averagePerMonth: 3.2,
    busiestMonth: "October 2023",
    busiestMonthCount: 12,
    quietestMonth: "February 2021",
    quietestMonthCount: 1,
    dateRange: "Jan 2020 - Nov 2024"
  }

*/

"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DiaryStatisticsProps {
  stats?: {
    totalEntries?: number;
    averagePerMonth?: number;
    busiestMonth?: string;
    busiestMonthCount?: number;
    quietestMonth?: string;
    quietestMonthCount?: number;
    dateRange?: string;
  };
}

interface StatItemProps {
  label: string;
  value: string | number;
  description?: string;
}

function StatItem({ label, value, description }: StatItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500 dark:text-white/50 font-medium uppercase">
        {label}
      </span>
      <span className="text-2xl font-bold text-black dark:text-white">
        {value}
      </span>
      {description && (
        <span className="text-xs text-slate-600 dark:text-white/60">
          {description}
        </span>
      )}
    </div>
  )
}

export function DiaryStatistics({ stats }: DiaryStatisticsProps) {
  if (!stats) {
    return (
      <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Your Statistics
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-white/60">
            Key metrics about your watching habits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-slate-500 dark:text-white/50">
            No statistics available. Upload your diary data to see your stats.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent">
      <CardHeader>
        <CardTitle className="text-black dark:text-white">
          Your Statistics
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-white/60">
          Key metrics about your watching habits
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row flex-wrap justify-between gap-6 sm:gap-8">
          <StatItem
            label="Total Entries"
            value={stats.totalEntries ?? 0}
            description="movies logged"
          />
          <StatItem
            label="Average/Month"
            value={(stats.averagePerMonth ?? 0).toFixed(1)}
            description="movies per month"
          />
          <StatItem
            label="Busiest Month"
            value={stats.busiestMonthCount ?? 0}
            description={stats.busiestMonth}
          />
          <StatItem
            label="Quietest Month"
            value={stats.quietestMonthCount ?? 0}
            description={stats.quietestMonth}
          />
        </div>
      </CardContent>

          {stats.dateRange && (
            <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-white/10 pl-8">
              <span className="text-xs text-slate-500 dark:text-white/50 font-medium uppercase">
                Date Range
              </span>
              <p className="text-sm text-black dark:text-white mt-1">
                {stats.dateRange}
              </p>
            </div>
          )}
    </Card>
  )
}
