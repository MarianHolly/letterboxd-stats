"use client";

import { motion } from "framer-motion";
import { DashboardLayout } from "./dashboard-layout";

export function LoadingSkeleton() {
  const shimmer = {
    initial: { opacity: 0.5 },
    animate: { opacity: 1 },
    transition: { duration: 1.5, repeat: Number.POSITIVE_INFINITY },
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Skeleton */}
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="h-24 bg-white/5 border border-white/10 rounded-lg"
        />

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              variants={shimmer}
              initial="initial"
              animate="animate"
              transition={{ delay: i * 0.1 }}
              className="h-32 bg-white/5 border border-white/10 rounded-lg"
            />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <motion.div
              key={i}
              variants={shimmer}
              initial="initial"
              animate="animate"
              transition={{ delay: i * 0.1 }}
              className="h-96 bg-white/5 border border-white/10 rounded-lg"
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
