"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function DashboardSection({
  title,
  description,
  children,
  className,
  delay = 0,
}: DashboardSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/[2.5%] p-6 backdrop-blur-sm",
        className
      )}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        {description && (
          <p className="text-white/60">{description}</p>
        )}
      </div>

      <div className="relative">
        {children}
      </div>
    </motion.div>
  );
}
