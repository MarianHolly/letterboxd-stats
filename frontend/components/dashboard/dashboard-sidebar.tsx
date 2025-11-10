"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Film,
  Menu,
  X,
  Home,
  Upload,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Analytics",
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: <BarChart3 className="w-5 h-5" />,
        description: "Key statistics and metrics",
      },
      {
        title: "Viewing Patterns",
        href: "/dashboard/patterns",
        icon: <TrendingUp className="w-5 h-5" />,
        description: "Trends and time-series analysis",
      },
      {
        title: "Genres & Directors",
        href: "/dashboard/genres",
        icon: <Film className="w-5 h-5" />,
        description: "Genre breakdown and directors",
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        title: "Upload New Data",
        href: "/dashboard/upload",
        icon: <Upload className="w-5 h-5" />,
        description: "Upload additional CSV files",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        title: "Preferences",
        href: "/dashboard/settings",
        icon: <Settings className="w-5 h-5" />,
        description: "App settings and preferences",
      },
    ],
  },
];

interface DashboardSidebarProps {
  className?: string;
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="text-white hover:bg-white/10"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-white/10 transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        {/* Logo / Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-rose-600 group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-white text-sm">Letterboxd</span>
              <span className="text-xs text-white/60">Analytics</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider px-3 py-2">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive(item.href)
                        ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                        : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div className="text-white/70">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-white/50 truncate">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start border-white/20 text-white hover:bg-white/10"
            asChild
          >
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Clear Data
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
