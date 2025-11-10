"use client";

import { DashboardSidebar } from "./dashboard-sidebar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardLayout({
  children,
  className,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 flex flex-col overflow-hidden md:ml-0",
          className
        )}
      >
        {/* Content area with scroll */}
        <div className="flex-1 overflow-y-auto pt-16 md:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
