"use client";

import { useEffect } from "react";
import { translate } from "@buyhksim/i18n";
import { useCommerceStore } from "../store/commerce-store";
import { apiRequest } from "../lib/api-client";
import type { CartLine } from "../store/commerce-store";

type RemoteCartLine = {
  skuId: string;
  quantity: number;
  productId: string;
  slug: string;
  title: string;
  kind: CartLine["kind"];
  image: string;
  priceMinor: number;
  attributes: {
    days?: number;
    validityDays?: number;
    data?: string;
    dataGb?: number;
  };
};

export function StorefrontProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useCommerceStore((state) => state.theme);
  const locale = useCommerceStore((state) => state.locale);
  const replaceCart = useCommerceStore((state) => state.replaceCart);
  const replaceFavorites = useCommerceStore((state) => state.replaceFavorites);
  useEffect(() => {
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media?.matches ? "dark" : "light") : theme;
    };
    apply();
    if (theme === "system") media?.addEventListener("change", apply);
    return () => media?.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === "zh-CN"
        ? "BUYHKSIM｜全球 SIM 与 eSIM 商城"
        : translate(locale, "BUYHKSIM｜全球 SIM 与 eSIM 商城");
  }, [locale]);
  useEffect(() => {
    if (!sessionStorage.getItem("buyhksim-access-token")) return;
    void Promise.all([
      apiRequest<{ ok: true; data: { lines: RemoteCartLine[] } }>("/cart"),
      apiRequest<{ ok: true; data: Array<{ id: string }> }>("/favorites"),
    ])
      .then(([cartPayload, favoritePayload]) => {
        const local = useCommerceStore.getState();
        const bySku = new Map(local.cart.map((line) => [line.skuId, line]));
        for (const line of cartPayload.data.lines) {
          const days = Number(
            line.attributes.days ?? line.attributes.validityDays ?? 1,
          );
          const data =
            line.attributes.data ??
            (line.attributes.dataGb
              ? `${line.attributes.dataGb}GB`
              : "按套餐说明");
          if (!bySku.has(line.skuId))
            bySku.set(line.skuId, {
              productId: line.productId,
              skuId: line.skuId,
              quantity: line.quantity,
              days,
              data,
              title: line.title,
              slug: line.slug,
              image: line.image,
              priceMinor: line.priceMinor,
              kind: line.kind,
            });
        }
        replaceCart([...bySku.values()]);
        replaceFavorites([
          ...new Set([
            ...local.favorites,
            ...favoritePayload.data.map((item) => item.id),
          ]),
        ]);
      })
      .catch(() => undefined);
  }, [replaceCart, replaceFavorites]);
  return children;
}
