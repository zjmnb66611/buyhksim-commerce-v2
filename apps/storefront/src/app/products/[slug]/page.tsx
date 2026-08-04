import { notFound } from "next/navigation";
import { fromCatalog, products, type CatalogProduct } from "@/data/products";
import { ProductDetail } from "./product-detail";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product = products.find((item) => item.slug === slug);
  try {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "true")
      return product ? <ProductDetail product={product} /> : notFound();
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";
    const response = await fetch(
      `${base}/catalog/products/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (response.ok) {
      const payload = (await response.json()) as {
        ok: true;
        data: CatalogProduct;
      };
      product = fromCatalog(payload.data) ?? product;
    }
  } catch {}
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
