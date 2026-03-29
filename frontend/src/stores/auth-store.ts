"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

interface AuthState {
  token: string;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Dev mode: token is always "dev_user"
  api.setToken("dev_user");

  return {
    token: "dev_user",
    isAuthenticated: true,
    setToken: (token: string) => {
      api.setToken(token);
      set({ token, isAuthenticated: !!token });
    },
  };
});
