"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import ThemeToggle from "@/components/layout/theme-toggle"

interface AnalyticsHeaderProps {
  title?: string
  description?: string
}

export function AnalyticsHeader({ title = "Analytics", description }: AnalyticsHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />

        <Separator orientation="vertical" className="h-4" />

        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>

      </div>
      <ThemeToggle />
    </header>
  )
}
