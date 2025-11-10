"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Film,
  User2,
  Upload,
  Settings,
  PencilIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

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

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader className="pb-0">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-rose-600">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-bold text-sm">Letterboxd</span>
            <span className="text-xs text-muted-foreground">Analytics</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-sm opacity-50">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                      <Link href={item.href} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-0.5">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter>
        {data.footerNav.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                      <Link href={item.href} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-0.5">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarFooter>
    </Sidebar>
  );
}
