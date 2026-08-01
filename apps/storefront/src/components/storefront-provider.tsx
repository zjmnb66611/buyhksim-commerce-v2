"use client";

import { useEffect } from "react";
import { useCommerceStore } from "@/store/commerce-store";

export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const theme = useCommerceStore((state) => state.theme);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = theme === "system" ? (media.matches ? "dark" : "light") : theme; };
    apply();
    if (theme === "system") media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return children;
}
