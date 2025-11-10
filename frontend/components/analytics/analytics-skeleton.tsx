"use client"

export function AnalyticsSkeleton() {
  return (
    <div className="flex-1 overflow-auto scroll-smooth animate-pulse">
      <div className="flex flex-1 flex-col gap-8 pt-8 px-8 pb-8 max-w-7xl mx-auto w-full">
        {/* Overview Section Skeleton */}
        <section>
          <div className="mb-4">
            <div className="h-8 w-32 bg-gray-200 dark:bg-white/10 rounded mb-2" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-white/10 rounded" />
          </div>
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-gray-200 dark:bg-white/5 aspect-video rounded-lg" />
            <div className="bg-gray-200 dark:bg-white/5 aspect-video rounded-lg" />
            <div className="bg-gray-200 dark:bg-white/5 aspect-video rounded-lg" />
          </div>
        </section>

        {/* Viewing Patterns Section Skeleton */}
        <section>
          <div className="mb-4">
            <div className="h-8 w-40 bg-gray-200 dark:bg-white/10 rounded mb-2" />
            <div className="h-4 w-72 bg-gray-200 dark:bg-white/10 rounded" />
          </div>
          <div className="bg-gray-200 dark:bg-white/5 min-h-96 rounded-lg" />
        </section>

        {/* Genres & Directors Section Skeleton */}
        <section>
          <div className="mb-4">
            <div className="h-8 w-48 bg-gray-200 dark:bg-white/10 rounded mb-2" />
            <div className="h-4 w-80 bg-gray-200 dark:bg-white/10 rounded" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-200 dark:bg-white/5 min-h-80 rounded-lg" />
            <div className="bg-gray-200 dark:bg-white/5 min-h-80 rounded-lg" />
          </div>
        </section>

        {/* Favorite Directors Section Skeleton */}
        <section>
          <div className="mb-4">
            <div className="h-8 w-40 bg-gray-200 dark:bg-white/10 rounded mb-2" />
            <div className="h-4 w-72 bg-gray-200 dark:bg-white/10 rounded" />
          </div>
          <div className="bg-gray-200 dark:bg-white/5 min-h-96 rounded-lg" />
        </section>

        {/* Decade Analysis Section Skeleton */}
        <section>
          <div className="mb-4">
            <div className="h-8 w-36 bg-gray-200 dark:bg-white/10 rounded mb-2" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-white/10 rounded" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-200 dark:bg-white/5 min-h-80 rounded-lg" />
            <div className="bg-gray-200 dark:bg-white/5 min-h-80 rounded-lg" />
          </div>
        </section>
      </div>
    </div>
  )
}
