import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: "watched" | "ratings" | "diary" | "unknown";
  data: string; // CSV content as string
  uploadedAt: number;
}

export interface UploadStore {
  // State
  files: UploadedFile[];
  sessionId: string | null;

  // Actions
  addFile: (file: UploadedFile) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  getFile: (id: string) => UploadedFile | undefined;
  getFilesByType: (type: UploadedFile["type"]) => UploadedFile[];
  hasWatchedFile: () => boolean;
}

export const useUploadStore = create<UploadStore>()(
  persist(
    (set, get) => ({
      // Initial state
      files: [],
      sessionId: null,

      // Actions
      addFile: (file: UploadedFile) =>
        set((state) => ({
          files: [...state.files, file],
        })),

      removeFile: (id: string) =>
        set((state) => ({
          files: state.files.filter((f) => f.id !== id),
        })),

      clearFiles: () =>
        set({
          files: [],
          sessionId: null,
        }),

      getFile: (id: string) => {
        const state = get();
        return state.files.find((f) => f.id === id);
      },

      getFilesByType: (type: UploadedFile["type"]) => {
        const state = get();
        return state.files.filter((f) => f.type === type);
      },

      hasWatchedFile: () => {
        const state = get();
        return state.files.some((f) => f.type === "watched");
      },
    }),
    {
      name: "letterboxd-upload-store",
      version: 2,
      // Automatically clear storage when version changes
      // This helps reset stale data from old store versions
      migrate: (persistedState: any, version: number) => {
        if (version === 0 || version === 1) {
          // Reset sessionId for old versions to prevent polling phantom sessions
          return {
            files: persistedState.files || [],
            sessionId: null,
          };
        }
        return persistedState;
      },
    }
  )
);
