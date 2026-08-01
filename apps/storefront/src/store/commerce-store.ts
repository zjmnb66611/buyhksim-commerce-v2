"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@buyhksim/i18n";

type CartLine = { productId: string; quantity: number; days: number; data: string };
type Theme = "system" | "light" | "dark";

type CommerceState = {
  cart: CartLine[];
  favorites: string[];
  recentlyViewed: string[];
  locale: Locale;
  theme: Theme;
  cartOpen: boolean;
  addToCart: (line: CartLine) => void;
  removeFromCart: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  toggleFavorite: (productId: string) => void;
  markViewed: (productId: string) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  setCartOpen: (open: boolean) => void;
  clearCart: () => void;
};

export const useCommerceStore = create<CommerceState>()(
  persist(
    (set) => ({
      cart: [], favorites: [], recentlyViewed: [], locale: "zh-CN", theme: "system", cartOpen: false,
      addToCart: (line) => set((state) => {
        const existing = state.cart.find((item) => item.productId === line.productId && item.days === line.days && item.data === line.data);
        const cart = existing
          ? state.cart.map((item) => item === existing ? { ...item, quantity: Math.min(99, item.quantity + line.quantity) } : item)
          : [...state.cart, line];
        return { cart, cartOpen: true };
      }),
      removeFromCart: (productId) => set((state) => ({ cart: state.cart.filter((item) => item.productId !== productId) })),
      setQuantity: (productId, quantity) => set((state) => ({ cart: state.cart.map((item) => item.productId === productId ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) } : item) })),
      toggleFavorite: (productId) => set((state) => ({ favorites: state.favorites.includes(productId) ? state.favorites.filter((id) => id !== productId) : [...state.favorites, productId] })),
      markViewed: (productId) => set((state) => ({ recentlyViewed: [productId, ...state.recentlyViewed.filter((id) => id !== productId)].slice(0, 20) })),
      setLocale: (locale) => set({ locale }), setTheme: (theme) => set({ theme }), setCartOpen: (cartOpen) => set({ cartOpen }), clearCart: () => set({ cart: [] }),
    }),
    { name: "buyhksim-v2-commerce", partialize: ({ cart, favorites, recentlyViewed, locale, theme }) => ({ cart, favorites, recentlyViewed, locale, theme }) },
  ),
);
