"use client";

import { motion } from "framer-motion";
import { Eye, Zap, Lock, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
};

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      viewport={{ once: true }}
      className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-all duration-300 hover:border-white/20"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 rounded-lg bg-indigo-500/20">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
      </div>
      <p className="text-white/60 leading-relaxed">{description}</p>
    </motion.div>
  );
}

export function AboutSection() {
  const features = [
    {
      icon: <Eye className="w-6 h-6 text-indigo-400" />,
      title: "Free Analytics",
      description:
        "Get powerful insights without paying for Letterboxd Premium. All features are completely free.",
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: "Rich Data",
      description:
        "Enriched with TMDB data: cast, directors, genres, runtime, ratings, and stunning visuals.",
    },
    {
      icon: <Lock className="w-6 h-6 text-rose-400" />,
      title: "Your Privacy",
      description:
        "Your viewing data never leaves your browser. No logins required. Complete anonymity.",
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-cyan-400" />,
      title: "Beautiful Insights",
      description:
        "Interactive charts and visualizations reveal your viewing patterns, preferences, and trends.",
    },
  ];

  return (
    <section className="relative py-20 md:py-32 px-4 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-rose-500/5 pointer-events-none" />

      <div className="relative z-10 container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Why Letterboxd Stats?
          </h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            A free, private alternative to premium analytics. Understand your movie-watching journey like never before.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
