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

interface CartState {
  cartCount: number;
  refreshCartCount: () => Promise<void>;
}

export const useAuthStore = create<AuthState & CartState>((set, get) => ({
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
    set({ user: null, token: null, cartCount: 0 });
    window.location.href = "/login";
  },
  isAuthenticated: () => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("access_token");
  },
  cartCount: 0,
  refreshCartCount: async () => {
    if (typeof window === "undefined") return;
    try {
      const { default: api } = await import("@/lib/api");
      const { data } = await api.get("/api/orders/cart/");
      set({ cartCount: (data.items || []).length });
    } catch { set({ cartCount: 0 }); }
  },
}));
