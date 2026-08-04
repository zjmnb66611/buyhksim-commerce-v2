"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "@phosphor-icons/react";
import { PageShell } from "@/components/page-shell";
import {
  formatMoney,
  fromCatalog,
  products,
  type CatalogProduct,
  type Product,
} from "@/data/products";
import { apiRequest } from "@/lib/api-client";
import { useCommerceStore } from "@/store/commerce-store";
import { useTranslations } from "@/hooks/use-translations";

export default function FavoritesPage() {
  const { favorites, toggleFavorite } = useCommerceStore();
  const { t, intlLocale } = useTranslations();
  const [catalog, setCatalog] = useState<Product[]>(products);

  useEffect(() => {
    let active = true;
    void apiRequest<{ ok: true; data: CatalogProduct[] }>(
      "/catalog/products",
      {},
      false,
    )
      .then((payload) => {
        const mapped = payload.data
          .map(fromCatalog)
          .filter((item): item is Product => item !== null);
        if (active) setCatalog(mapped);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const items = catalog.filter((product) => favorites.includes(product.id));
  return (
    <PageShell>
      <main className="container-shell py-8">
        <h1 className="text-3xl font-black">{t("我的收藏")}</h1>
        <p className="mt-2 quiet">
          {t("收藏的套餐会同步显示价格和库存变化。")}
        </p>
        {items.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((product) => (
              <article
                key={product.id}
                className="surface overflow-hidden rounded-xl"
              >
                <Link
                  href={`/product?slug=${encodeURIComponent(product.slug)}`}
                  className="relative block aspect-[4/3]"
                >
                  <Image
                    src={product.image}
                    alt={t(product.title)}
                    fill
                    className="object-cover"
                  />
                </Link>
                <div className="p-4">
                  <h2 className="font-bold">{t(product.title)}</h2>
                  <p className="mt-2 price text-xl font-black">
                    {formatMoney(product.priceMinor, intlLocale)} {t("起")}
                  </p>
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className="mt-4 flex items-center gap-2 text-sm quiet"
                  >
                    <Heart weight="fill" className="text-red-500" />
                    {t("取消收藏")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="surface mt-6 rounded-xl p-12 text-center">
            <Heart size={50} className="mx-auto quiet" />
            <h2 className="mt-4 font-bold">{t("还没有收藏商品")}</h2>
            <Link
              href="/#products"
              className="mt-5 inline-block rounded-lg bg-[var(--forest)] px-5 py-2.5 text-white"
            >
              {t("浏览套餐")}
            </Link>
          </div>
        )}
      </main>
    </PageShell>
  );
}
