"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import {
  BarChart3,
  TrendingUp,
  Film,
  User2,
  Upload,
  Settings,
  PencilIcon,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { useUploadStore } from "@/hooks/use-upload-store";

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

// Navigation data for analytics sections
const data = {
  navMain: [
    {
      title: "General Analytics",
      href: "#",
      items: [
        {
          title: "Overview",
          href: "#analytics-overview",
          icon: <BarChart3 className="w-5 h-5" />,
          description: "Key statistics and metrics",
        },
        {
          title: "Viewing Patterns",
          href: "#analytics-patterns",
          icon: <TrendingUp className="w-5 h-5" />,
          description: "Trends and time-series analysis",
        },
        {
          title: "Genres & Directors",
          href: "#analytics-genres",
          icon: <Film className="w-5 h-5" />,
          description: "Genre breakdown and directors",
        },
      ],
    },
    {
      title: "Personal Analytics",
      href: "#",
      items: [
        {
          title: "Favorite Directors",
          href: "#analytics-directors",
          icon: <User2 className="w-5 h-5" />,
          description: "Your most watched directors",
        },
        {
          title: "Decade Analysis",
          href: "#analytics-decades",
          icon: <TrendingUp className="w-5 h-5" />,
          description: "Movies by decade and era",
        },
      ],
    },
  ],
  footerNav: [
    {
      title: "Settings",
      href: "#",
      items: [
        {
          title: "Create Custom Analytics",
          href: "#",
          icon: <PencilIcon className="w-5 h-5" />,
          description: "Design your own analytics",
        },
        {
          title: "Preferences",
          href: "/dashboard/settings",
          icon: <Settings className="w-5 h-5" />,
          description: "App settings and preferences",
        },
        {
          title: "Upload New Data",
          href: "/dashboard/upload",
          icon: <Upload className="w-5 h-5" />,
          description: "Upload new CSV files",
        },
      ],
    },
  ],
};

export function AnalyticsSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<string>("");
  const clearFiles = useUploadStore((state) => state.clearFiles);

  // Detect which section is currently in view using Intersection Observer
  React.useEffect(() => {
    const sections = [
      "analytics-overview",
      "analytics-patterns",
      "analytics-genres",
      "analytics-directors",
      "analytics-decades",
    ];

    // Create Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first (topmost) visible section
        const visibleSections = entries.filter((entry) => entry.isIntersecting);

        if (visibleSections.length > 0) {
          // Sort by position in viewport (top to bottom)
          const topMostSection = visibleSections.reduce((prev, current) => {
            return prev.boundingClientRect.top > current.boundingClientRect.top
              ? current
              : prev;
          });

          setActiveSection(`#${topMostSection.target.id}`);
        }
      },
      {
        root: document.querySelector("main"),
        rootMargin: "-20% 0px -80% 0px", // Trigger when section is in top 20% of viewport
        threshold: 0, // Trigger as soon as section enters
      }
    );

    // Observe all sections
    sections.forEach((section) => {
      const element = document.getElementById(section);
      if (element) {
        observer.observe(element);
      }
    });

    // Cleanup
    return () => {
      sections.forEach((section) => {
        const element = document.getElementById(section);
        if (element) {
          observer.unobserve(element);
        }
      });
      observer.disconnect();
    };
  }, []);

  const isActive = (href: string) => {
    // Check if it's a hash link (analytics section)
    if (href.startsWith("#")) {
      return activeSection === href;
    }

    // Check if it's a regular route
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar
      className="bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border-r border-gray-200 dark:border-white/10"
      {...props}
    >
      <SidebarHeader className="pb-0 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-rose-600">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-bold text-sm text-foreground dark:text-white">
              Letterboxd
            </span>
            <span className="text-xs text-gray-600 dark:text-white/60">
              Analytics
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950">
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-xs font-semibold text-gray-800 dark:text-white/30 uppercase tracking-wider px-3 py-2">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 scroll-smooth",
                      isActive(item.href)
                        ? "bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30"
                        : "text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0",
                        isActive(item.href)
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-600 dark:text-white/70"
                      )}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.title}
                      </p>
                      <p
                        className={cn(
                          "text-xs truncate",
                          isActive(item.href)
                            ? "text-indigo-500 dark:text-indigo-300"
                            : "text-gray-500 dark:text-white/50"
                        )}
                      >
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter className="bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border-t border-gray-200 dark:border-white/10">
        {data.footerNav.map((group) => (
          <SidebarGroup key={group.title}>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 scroll-smooth",
                    isActive(item.href)
                      ? "bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30"
                      : "text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0",
                      isActive(item.href)
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-gray-600 dark:text-white/70"
                    )}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p
                      className={cn(
                        "text-xs truncate",
                        isActive(item.href)
                          ? "text-indigo-500 dark:text-indigo-300"
                          : "text-gray-500 dark:text-white/50"
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </SidebarGroup>
        ))}
        <div className="pt-2 mt-2 border-t border-gray-200 dark:border-white/10">
          <Button
            onClick={clearFiles}
            variant="ghost"
            className="w-full justify-start text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Clear Data
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
