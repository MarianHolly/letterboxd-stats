"use client"

import { AnalyticsSidebar } from "@/components/analytics/analytics-sidebar"
import { AnalyticsHeader } from "@/components/analytics/analytics-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function AnalyticsPage() {
  return (
    <SidebarProvider>
      <AnalyticsSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
          <AnalyticsHeader title="Analytics Dashboard" description="Explore your Letterboxd statistics" />

          <main className="flex-1 overflow-auto">
            <div className="flex flex-1 flex-col gap-8 p-8 max-w-7xl mx-auto w-full">
              {/* Overview Section */}
              <section id="analytics-overview">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground mb-1">Overview</h2>
                  <p className="text-sm text-muted-foreground">Key statistics and metrics about your viewing habits</p>
                </div>
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                  <div className="bg-muted/50 aspect-video rounded-lg" />
                  <div className="bg-muted/50 aspect-video rounded-lg" />
                  <div className="bg-muted/50 aspect-video rounded-lg" />
                </div>
              </section>

              {/* Viewing Patterns Section */}
              <section id="analytics-patterns">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground mb-1">Viewing Patterns</h2>
                  <p className="text-sm text-muted-foreground">Trends and time-series analysis of your movie watching</p>
                </div>
                <div className="bg-muted/50 min-h-96 rounded-lg" />
              </section>

              {/* Genres & Directors Section */}
              <section id="analytics-genres">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground mb-1">Genres & Directors</h2>
                  <p className="text-sm text-muted-foreground">Genre breakdown and your favorite directors</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-muted/50 min-h-80 rounded-lg" />
                  <div className="bg-muted/50 min-h-80 rounded-lg" />
                </div>
              </section>

              {/* Favorite Directors Section */}
              <section id="analytics-directors">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground mb-1">Favorite Directors</h2>
                  <p className="text-sm text-muted-foreground">Your most watched directors and their filmography</p>
                </div>
                <div className="bg-muted/50 min-h-96 rounded-lg" />
              </section>

              {/* Decade Analysis Section */}
              <section id="analytics-decades">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground mb-1">Decade Analysis</h2>
                  <p className="text-sm text-muted-foreground">Movies by decade and era</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-muted/50 min-h-80 rounded-lg" />
                  <div className="bg-muted/50 min-h-80 rounded-lg" />
                </div>
              </section>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
