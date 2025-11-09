"use client";

import { motion } from "framer-motion";
import { Download, Upload, BarChart3, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type StepProps = {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  isLast?: boolean;
};

function Step({ number, icon, title, description, delay, isLast }: StepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      viewport={{ once: true }}
      className="flex flex-col items-center relative"
    >
      {/* Step Circle */}
      <div className="mb-6 flex items-center justify-center relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/30 to-rose-500/30 blur-lg" />
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-rose-600 flex items-center justify-center border border-white/20">
          <span className="text-2xl font-bold text-white">{number}</span>
        </div>
      </div>

      {/* Icon */}
      <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
        {icon}
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold text-white mb-3 text-center">{title}</h3>
      <p className="text-white/60 text-center max-w-xs leading-relaxed">
        {description}
      </p>

      {/* Arrow to next step */}
      {!isLast && (
        <div className="hidden lg:flex absolute top-32 -right-8 xl:-right-16 items-center justify-center">
          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          >
            <ArrowRight className="w-6 h-6 text-white/30" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export function StepsSection() {
  const steps = [
    {
      number: 1,
      icon: <Download className="w-8 h-8 text-indigo-400" />,
      title: "Export Your Data",
      description:
        "Go to Letterboxd Settings → Import & Export. Download your CSV files (watched, ratings, diary).",
    },
    {
      number: 2,
      icon: <Upload className="w-8 h-8 text-rose-400" />,
      title: "Upload Files",
      description:
        "Drag and drop your CSV files here or click to browse. Upload one file at a time or all together.",
    },
    {
      number: 3,
      icon: <BarChart3 className="w-8 h-8 text-cyan-400" />,
      title: "Explore Analytics",
      description:
        "View interactive charts, trends, statistics, and insights about your complete movie-watching history.",
    },
  ];

  return (
    <section className="relative py-20 md:py-32 px-4 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent pointer-events-none" />

      <div className="relative z-10 container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            How It Works
          </h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            Three simple steps to transform your Letterboxd data into beautiful insights.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-12 lg:gap-8">
          {steps.map((step, index) => (
            <Step
              key={step.title}
              number={step.number}
              icon={step.icon}
              title={step.title}
              description={step.description}
              delay={index * 0.15}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
