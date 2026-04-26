"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "@/lib/api";
import { setAuthCookie, clearAuthCookie } from "@/lib/auth-cookie";

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
  plan: string;
  active_exam_id: string | null;
  enrolled_exams: EnrolledExam[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setAuthFromToken: (token: string, user: AuthUser) => void;
  setActiveExam: (examId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      _hasHydrated: false,

      login: async (email: string, password: string) => {
        const data = await api.login(email, password);
        localStorage.setItem("sparkupcloud_token", data.access_token);
        api.setToken(data.access_token);
        // Mirror to cookie so SSR/public pages can detect auth
        setAuthCookie({
          e: data.user.email,
          n: data.user.display_name,
          p: "free",
        });
        set({
          token: data.access_token,
          user: { ...data.user, is_admin: false, plan: "free", active_exam_id: null, enrolled_exams: [] },
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
        clearAuthCookie();
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      loadUser: async () => {
        const token = get().token ?? (typeof window !== "undefined" ? localStorage.getItem("sparkupcloud_token") : null);
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        api.setToken(token);
        try {
          const me = await api.getMe();
          // Refresh the cookie with the latest plan/name
          setAuthCookie({
            e: me.email,
            n: me.display_name,
            p: me.plan ?? "free",
            ...(me.is_admin ? { a: 1 as const } : {}),
          });
          set({
            token,
            user: {
              id: me.id,
              email: me.email,
              display_name: me.display_name,
              is_admin: me.is_admin,
              plan: me.plan ?? "free",
              active_exam_id: me.active_exam_id ?? null,
              enrolled_exams: me.enrolled_exams ?? [],
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: unknown) {
          // CRITICAL: only clear auth on a real 401 (token actually invalid).
          // Transient errors — 500, 502, 504, CORS preflight, network blip,
          // backend cold start — must NOT log the user out. Otherwise one
          // unlucky request after pressing browser-back kicks them to /login
          // even though their token is still good.
          //
          // The api client throws Error("API <status>: <body>") so we parse
          // the status from the message. Anything that isn't 401 is treated
          // as transient — we keep the cached auth state and let a later
          // request retry naturally.
          const msg = err instanceof Error ? err.message : "";
          const isAuthFailure = /^API 401\b/.test(msg) || /^API 403\b/.test(msg);

          if (isAuthFailure) {
            // True invalid/expired token — wipe and force re-login
            localStorage.removeItem("sparkupcloud_token");
            api.setToken(null);
            clearAuthCookie();
            set({
              token: null,
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          } else {
            // Transient error (network/5xx). Keep the cached user visible —
            // they were authenticated when the page loaded; a flaky backend
            // shouldn't punish them. Just stop the loading spinner.
            console.warn("loadUser transient failure, keeping cached auth:", msg);
            set({ isLoading: false });
          }
        }
      },

      setAuthFromToken: (token: string, user: AuthUser) => {
        localStorage.setItem("sparkupcloud_token", token);
        api.setToken(token);
        setAuthCookie({
          e: user.email,
          n: user.display_name,
          p: user.plan,
          ...(user.is_admin ? { a: 1 as const } : {}),
        });
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
    }),
    {
      name: "sparkupcloud-auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist auth-critical fields — not loading states or methods
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // Hydration complete — restore the API client token and mark hydrated
            if (state.token) {
              api.setToken(state.token);
            }
            // Trust the persisted auth state immediately — loadUser() will
            // re-validate with the backend in the background. This prevents
            // the flash-redirect-to-login on every page load.
            state.isLoading = !state.isAuthenticated;
            state._hasHydrated = true;
          }
        };
      },
    }
  )
);
