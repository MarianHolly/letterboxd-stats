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
  sessionId: string;

  // Actions
  addFile: (file: UploadedFile) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  getFile: (id: string) => UploadedFile | undefined;
  getFilesByType: (type: UploadedFile["type"]) => UploadedFile[];
  hasWatchedFile: () => boolean;
}

// Generate a unique session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useUploadStore = create<UploadStore>()(
  persist(
    (set, get) => ({
      // Initial state
      files: [],
      sessionId: generateSessionId(),

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
          sessionId: generateSessionId(),
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
      // Don't persist session data between browser sessions
      version: 1,
    }
  )
);
