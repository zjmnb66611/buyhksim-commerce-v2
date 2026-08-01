"use client";

import { useEffect } from "react";
import { translate } from "@buyhksim/i18n";
import { useCommerceStore } from "../store/commerce-store";

export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const theme = useCommerceStore((state) => state.theme);
  const locale = useCommerceStore((state) => state.locale);
  useEffect(() => {
    const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const apply = () => { document.documentElement.dataset.theme = theme === "system" ? (media?.matches ? "dark" : "light") : theme; };
    apply();
    if (theme === "system") media?.addEventListener("change", apply);
    return () => media?.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "zh-CN" ? "BUYHKSIM｜全球 SIM 与 eSIM 商城" : translate(locale, "BUYHKSIM｜全球 SIM 与 eSIM 商城");
  }, [locale]);
  return children;
}
