"use client";

import { create } from "zustand";

interface UserData {
  id: number; username: string; email: string;
}

interface AuthState {
  user: UserData | null;
  token: string | null;
  setAuth: (user: UserData, access: string, refresh: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

function getStoredUser(): UserData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user_data");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  token: typeof window !== "undefined" ? localStorage.getItem("access_token") : null,
  setAuth: (user, access, refresh) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    localStorage.setItem("user_data", JSON.stringify(user));
    set({ user, token: access });
  },
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    set({ user: null, token: null });
    window.location.href = "/login";
  },
  isAuthenticated: () => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("access_token");
  },
}));
