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
      // Prepare FormData for multipart upload
      const formData = new FormData();
      const validFiles = files.filter(
        (f) => f.status === "success" && f.type !== "unknown"
      );

      if (validFiles.length === 0) {
        alert("No valid files to upload");
        return;
      }

      // Add files to FormData
      for (const uploadedFile of validFiles) {
        formData.append("files", uploadedFile.file);
      }

      // Send to backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
      }

      const data = await response.json();
      const sessionId = data.session_id;

      // Store the real session ID from backend
      useUploadStore.setState({ sessionId });

      // Also store files locally for offline access
      for (const file of validFiles) {
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

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error uploading files:", error);
      alert(`Error uploading files: ${error instanceof Error ? error.message : "Unknown error"}`);
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
