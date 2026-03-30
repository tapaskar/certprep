"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  active_exam_id: string | null;
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
        user: { ...data.user, is_admin: false, active_exam_id: null },
        isAuthenticated: true,
        isLoading: false,
      });
      // loadUser will be called from the layout to fetch full profile including is_admin
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
  };
});
