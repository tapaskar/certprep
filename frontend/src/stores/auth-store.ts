"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

export interface EnrolledExam {
  exam_id: string;
  exam_name: string;
  exam_code: string;
  readiness_pct: number;
  exam_date: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  active_exam_id: string | null;
  enrolled_exams: EnrolledExam[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setAuthFromToken: (token: string, user: AuthUser) => void;
  setActiveExam: (examId: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // On init: check localStorage for existing token
  if (typeof window !== "undefined") {
    const savedToken = localStorage.getItem("sparkupcloud_token");
    if (savedToken) {
      api.setToken(savedToken);
    }
  }

  return {
    token: typeof window !== "undefined" ? localStorage.getItem("sparkupcloud_token") : null,
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (email: string, password: string) => {
      const data = await api.login(email, password);
      localStorage.setItem("sparkupcloud_token", data.access_token);
      api.setToken(data.access_token);
      set({
        token: data.access_token,
        user: { ...data.user, is_admin: false, active_exam_id: null, enrolled_exams: [] },
        isAuthenticated: true,
        isLoading: false,
      });
      // Immediately load full profile (includes is_admin, enrolled_exams)
      await get().loadUser();
    },

    register: async (name: string, email: string, password: string) => {
      await api.register(name, email, password);
    },

    logout: () => {
      localStorage.removeItem("sparkupcloud_token");
      api.setToken(null);
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    },

    loadUser: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("sparkupcloud_token") : null;
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      api.setToken(token);
      try {
        const me = await api.getMe();
        set({
          token,
          user: {
            id: me.id,
            email: me.email,
            display_name: me.display_name,
            is_admin: me.is_admin,
            active_exam_id: me.active_exam_id ?? null,
            enrolled_exams: me.enrolled_exams ?? [],
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Token is invalid or expired
        localStorage.removeItem("sparkupcloud_token");
        api.setToken(null);
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    setAuthFromToken: (token: string, user: AuthUser) => {
      localStorage.setItem("sparkupcloud_token", token);
      api.setToken(token);
      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    },

    setActiveExam: (examId: string) => {
      const { user } = get();
      if (user) {
        set({ user: { ...user, active_exam_id: examId } });
      }
    },
  };
});
