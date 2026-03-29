import { create } from "zustand";
import { api } from "@/lib/api";
import type { ProgressResponse } from "@/lib/api-types";

interface ProgressState {
  progress: ProgressResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchProgress: (examId: string) => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set) => ({
  progress: null,
  isLoading: false,
  error: null,

  fetchProgress: async (examId) => {
    set({ isLoading: true, error: null });
    try {
      const progress = await api.getProgress(examId);
      set({ progress, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load progress",
        isLoading: false,
      });
    }
  },
}));
