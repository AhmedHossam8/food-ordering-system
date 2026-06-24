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

interface CartItemData {
  id: number; menu_item: number; menu_item_name: string; menu_item_name_localized?: string;
  menu_item_price: string; quantity: number; subtotal: string;
}

interface CartState {
  cartCount: number;
  cartItems: CartItemData[];
  cartTotal: string;
  setCartData: (items: CartItemData[], total: string) => void;
  refreshCartCount: () => Promise<void>;
}

function getStoredCartItems(): CartItemData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("cart_items");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getStoredCartTotal(): string {
  if (typeof window === "undefined") return "0.00";
  try {
    return localStorage.getItem("cart_total") || "0.00";
  } catch { return "0.00"; }
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
    localStorage.removeItem("cart_items");
    localStorage.removeItem("cart_total");
    set({ user: null, token: null, cartCount: 0, cartItems: [], cartTotal: "0.00" });
    window.location.href = "/login";
  },
  isAuthenticated: () => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("access_token");
  },
  cartCount: 0,
  cartItems: getStoredCartItems(),
  cartTotal: getStoredCartTotal(),
  setCartData: (items, total) => {
    localStorage.setItem("cart_items", JSON.stringify(items));
    localStorage.setItem("cart_total", total);
    set({ cartItems: items, cartTotal: total });
  },
  refreshCartCount: async () => {
    if (typeof window === "undefined") return;
    try {
      const { default: api } = await import("@/lib/api");
      const { data } = await api.get("/api/orders/cart/count/");
      set({ cartCount: data.count ?? 0 });
    } catch { set({ cartCount: 0 }); }
  },
}));
