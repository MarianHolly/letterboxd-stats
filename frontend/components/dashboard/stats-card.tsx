"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  className?: string;
  delay?: number;
}

export function StatsCard({
  label,
  value,
  description,
  icon,
  trend,
  className,
  delay = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/[2.5%] p-6 backdrop-blur-sm",
        "hover:border-white/20 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/5 transition-all duration-300",
        className
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-rose-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-white/60 uppercase tracking-wider">
            {label}
          </label>
          {icon && <div className="text-white/40">{icon}</div>}
        </div>

        <div className="space-y-1">
          <p className="text-3xl font-bold text-white">{value}</p>
          {description && (
            <p className="text-sm text-white/50">{description}</p>
          )}
        </div>

        {trend && (
          <div
            className={cn(
              "inline-flex items-center gap-1 mt-2 text-xs font-medium px-2 py-1 rounded",
              trend.direction === "up"
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            )}
          >
            <span>
              {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
