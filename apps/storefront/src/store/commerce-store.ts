"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@buyhksim/i18n";

export type CartLine = {
  productId: string;
  skuId: string;
  quantity: number;
  days: number;
  data: string;
  title: string;
  slug: string;
  image: string;
  priceMinor: number;
  kind: "ESIM" | "PHYSICAL_SIM";
};
type Theme = "system" | "light" | "dark";

type CommerceState = {
  cart: CartLine[];
  favorites: string[];
  recentlyViewed: string[];
  locale: Locale;
  theme: Theme;
  cartOpen: boolean;
  addToCart: (line: CartLine) => void;
  removeFromCart: (skuId: string) => void;
  setQuantity: (skuId: string, quantity: number) => void;
  toggleFavorite: (productId: string) => void;
  markViewed: (productId: string) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  setCartOpen: (open: boolean) => void;
  clearCart: () => void;
  replaceCart: (cart: CartLine[]) => void;
  replaceFavorites: (favorites: string[]) => void;
};

export const useCommerceStore = create<CommerceState>()(
  persist(
    (set) => ({
      cart: [],
      favorites: [],
      recentlyViewed: [],
      locale: "zh-CN",
      theme: "system",
      cartOpen: false,
      addToCart: (line) =>
        set((state) => {
          const existing = state.cart.find((item) => item.skuId === line.skuId);
          const cart = existing
            ? state.cart.map((item) =>
                item === existing
                  ? {
                      ...item,
                      quantity: Math.min(99, item.quantity + line.quantity),
                    }
                  : item,
              )
            : [...state.cart, line];
          queueMicrotask(scheduleCommerceSync);
          return { cart, cartOpen: true };
        }),
      removeFromCart: (skuId) =>
        set((state) => {
          queueMicrotask(scheduleCommerceSync);
          return { cart: state.cart.filter((item) => item.skuId !== skuId) };
        }),
      setQuantity: (skuId, quantity) =>
        set((state) => {
          queueMicrotask(scheduleCommerceSync);
          return {
            cart: state.cart.map((item) =>
              item.skuId === skuId
                ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) }
                : item,
            ),
          };
        }),
      toggleFavorite: (productId) =>
        set((state) => {
          queueMicrotask(scheduleCommerceSync);
          return {
            favorites: state.favorites.includes(productId)
              ? state.favorites.filter((id) => id !== productId)
              : [...state.favorites, productId],
          };
        }),
      markViewed: (productId) =>
        set((state) => ({
          recentlyViewed: [
            productId,
            ...state.recentlyViewed.filter((id) => id !== productId),
          ].slice(0, 20),
        })),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setCartOpen: (cartOpen) => set({ cartOpen }),
      clearCart: () => {
        set({ cart: [] });
        queueMicrotask(scheduleCommerceSync);
      },
      replaceCart: (cart) => {
        set({ cart });
        queueMicrotask(scheduleCommerceSync);
      },
      replaceFavorites: (favorites) => {
        set({ favorites });
        queueMicrotask(scheduleCommerceSync);
      },
    }),
    {
      name: "buyhksim-v2-commerce",
      version: 3,
      partialize: ({ cart, favorites, recentlyViewed, locale, theme }) => ({
        cart,
        favorites,
        recentlyViewed,
        locale,
        theme,
      }),
    },
  ),
);

let syncTimer: ReturnType<typeof setTimeout> | undefined;
async function syncAuthenticatedCommerce() {
  if (
    typeof window === "undefined" ||
    !sessionStorage.getItem("buyhksim-access-token")
  )
    return;
  const { apiRequest } = await import("../lib/api-client");
  const state = useCommerceStore.getState();
  await apiRequest("/cart", {
    method: "PUT",
    body: JSON.stringify({
      lines: state.cart.map(({ skuId, quantity }) => ({ skuId, quantity })),
    }),
  });
  const remote = await apiRequest<{ ok: true; data: Array<{ id: string }> }>(
    "/favorites",
  );
  const remoteIds = new Set(remote.data.map((item) => item.id));
  await Promise.all(
    [...new Set([...state.favorites, ...remoteIds])].map((id) =>
      state.favorites.includes(id) === remoteIds.has(id)
        ? Promise.resolve()
        : apiRequest(`/favorites/${id}`, {
            method: state.favorites.includes(id) ? "POST" : "DELETE",
          }),
    ),
  );
}
function scheduleCommerceSync() {
  if (
    typeof window === "undefined" ||
    !sessionStorage.getItem("buyhksim-access-token")
  )
    return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(
    () => void syncAuthenticatedCommerce().catch(() => undefined),
    350,
  );
}
