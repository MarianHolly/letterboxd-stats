"use client";

import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import ThemeToggle from "@/components/layout/theme-toggle";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";

interface AnalyticsHeaderProps {
  title?: string;
  description?: string;
}

export function AnalyticsHeader({
  title = "Analytics",
  description,
}: AnalyticsHeaderProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex flex-col border-b border-gray-200 dark:border-white/10 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => toggleSidebar()}
            className="border-gray-50 text-foreground hover:bg-gray-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            <Menu className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <Separator
            orientation="vertical"
            className="h-6 bg-gray-200 dark:bg-white/10"
          />
          <div>
            <h1 className="text-xl font-semibold text-foreground dark:text-white">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-gray-600 dark:text-white/60">
                {description}
              </p>
            )}
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
