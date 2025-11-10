"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeroSection } from "@/components/layout/hero-section";
import { AboutSection } from "@/components/landing/about-section";
import { StepsSection } from "@/components/landing/steps-section";
import { UploadModal } from "@/components/landing/upload-modal";
import { useUploadStore } from "@/hooks/use-upload-store";
import { parseCSV, getFileType, validateCSV } from "@/lib/csv-parser";

interface UploadedFile {
  file: File;
  type: "watched" | "ratings" | "diary" | "unknown";
  status: "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export default function Home() {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const addFile = useUploadStore((state) => state.addFile);

  const handleUploadComplete = async (files: UploadedFile[]) => {
    try {
      // Process and store uploaded files
      for (const file of files) {
        if (file.status === "success" && file.type !== "unknown") {
          const fileType = getFileType(file.file.name);
          const csvContent = await file.file.text();

          // Parse CSV to validate structure
          const parsed = await parseCSV(file.file);
          const validation = validateCSV(fileType, parsed);

          if (validation.valid) {
            // Store file in zustand state
            addFile({
              id: `${Date.now()}_${Math.random()}`,
              name: file.file.name,
              size: file.file.size,
              type: fileType,
              data: csvContent,
              uploadedAt: Date.now(),
            });
          }
        }
      }

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Error processing files. Please try again.");
    }
  };

  return (
    <main className="w-full">
      {/* Hero Section */}
      <HeroSection onUploadClick={() => setIsUploadModalOpen(true)} />

      {/* About Section */}
      <AboutSection />

      {/* Steps Section */}
      <StepsSection />

      {/* Upload Modal */}
      <UploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onUploadComplete={handleUploadComplete}
      />
    </main>
  );
}
