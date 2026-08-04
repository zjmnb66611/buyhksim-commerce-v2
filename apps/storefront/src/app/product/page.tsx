"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ProductDetail } from "../products/[slug]/product-detail";
import {
  fromCatalog,
  products,
  type CatalogProduct,
  type Product,
} from "@/data/products";
import { apiRequest } from "@/lib/api-client";
import { useTranslations } from "@/hooks/use-translations";

function ProductLoader() {
  const params = useSearchParams();
  const slug = params.get("slug") ?? "";
  const { t } = useTranslations();
  const [product, setProduct] = useState<Product | null | undefined>(() =>
    products.find((item) => item.slug === slug),
  );

  useEffect(() => {
    if (!slug) {
      setProduct(null);
      return;
    }
    let active = true;
    void apiRequest<{ ok: true; data: CatalogProduct }>(
      `/catalog/products/${encodeURIComponent(slug)}`,
      {},
      false,
    )
      .then((payload) => {
        if (active) setProduct(fromCatalog(payload.data));
      })
      .catch(() => {
        if (active)
          setProduct(products.find((item) => item.slug === slug) ?? null);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (product === undefined)
    return (
      <PageShell>
        <main className="container-shell py-20 text-center quiet">
          {t("正在加载商品…")}
        </main>
      </PageShell>
    );
  if (product === null)
    return (
      <PageShell>
        <main className="container-shell py-20 text-center">
          <h1 className="text-2xl font-black">{t("商品不存在或已下架")}</h1>
          <Link
            href="/#products"
            className="mt-5 inline-block text-[var(--forest)]"
          >
            {t("返回选购")}
          </Link>
        </main>
      </PageShell>
    );
  return <ProductDetail product={product} />;
}

export default function ProductRoute() {
  return (
    <Suspense fallback={null}>
      <ProductLoader />
    </Suspense>
  );
}
