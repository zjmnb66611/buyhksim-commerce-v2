import { publicAsset } from "@/lib/base-path";

export type Product = {
  id: string;
  skuId: string;
  slug: string;
  title: string;
  destination: string;
  region: "亚洲" | "欧洲" | "北美洲" | "大洋洲";
  kind: "ESIM" | "PHYSICAL_SIM";
  image: string;
  priceMinor: number;
  compareAtMinor?: number;
  rating: number;
  soldLabel: string;
  days: number[];
  data: string[];
  network: string;
  inStock: boolean;
  badge?: string;
};

export const products: Product[] = [
  {
    id: "31111111-1111-4111-8111-111111111111",
    skuId: "5a1a1111-1111-4111-8111-111111111111",
    slug: "hong-kong-5g-esim",
    title: "香港 5G eSIM",
    destination: "香港",
    region: "亚洲",
    kind: "ESIM",
    image: publicAsset("/images/hong-kong.webp"),
    priceMinor: 5800,
    compareAtMinor: 7200,
    rating: 0,
    soldLabel: "0",
    days: [5],
    data: ["5GB"],
    network: "CSL / 3HK",
    inStock: true,
  },
  {
    id: "32222222-2222-4222-8222-222222222222",
    skuId: "5a1a2222-2222-4222-8222-222222222222",
    slug: "japan-5g-esim",
    title: "日本 5G eSIM",
    destination: "日本",
    region: "亚洲",
    kind: "ESIM",
    image: publicAsset("/images/japan.webp"),
    priceMinor: 6800,
    compareAtMinor: 8800,
    rating: 0,
    soldLabel: "0",
    days: [7],
    data: ["10GB"],
    network: "Docomo / KDDI",
    inStock: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    skuId: "5a1a3333-3333-4333-8333-333333333333",
    slug: "europe-33-countries-esim",
    title: "欧洲多国 33 国 eSIM",
    destination: "欧洲 33 国",
    region: "欧洲",
    kind: "ESIM",
    image: publicAsset("/images/europe.webp"),
    priceMinor: 19800,
    compareAtMinor: 23800,
    rating: 0,
    soldLabel: "0",
    days: [15],
    data: ["30GB"],
    network: "多国优选网络",
    inStock: true,
  },
  {
    id: "34444444-4444-4444-8444-444444444444",
    skuId: "5a1a4444-4444-4444-8444-444444444444",
    slug: "singapore-5g-esim",
    title: "新加坡 5G eSIM",
    destination: "新加坡",
    region: "亚洲",
    kind: "ESIM",
    image: publicAsset("/images/hero-rome.webp"),
    priceMinor: 4800,
    rating: 0,
    soldLabel: "0",
    days: [5],
    data: ["5GB"],
    network: "Singtel / StarHub",
    inStock: true,
  },
  {
    id: "35555555-5555-4555-8555-555555555555",
    skuId: "5a1a5555-5555-4555-8555-555555555555",
    slug: "thailand-8-day-sim",
    title: "泰国 8 天上网卡",
    destination: "泰国",
    region: "亚洲",
    kind: "PHYSICAL_SIM",
    image: publicAsset("/images/hero-rome.webp"),
    priceMinor: 3900,
    rating: 0,
    soldLabel: "0",
    days: [8],
    data: ["15GB"],
    network: "AIS / True",
    inStock: true,
  },
];

export const formatMoney = (minor: number, locale = "zh-CN") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
  }).format(minor / 100);

export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  destination: string;
  kind: "ESIM" | "PHYSICAL_SIM";
  image: string;
  skus: Array<{
    id: string;
    priceMinor: number;
    compareAtPriceMinor: number | null;
    attributes: {
      days?: number;
      validityDays?: number;
      data?: string;
      dataGb?: number;
    };
    available: number;
  }>;
};
export function fromCatalog(item: CatalogProduct): Product | null {
  const sku = item.skus[0];
  if (!sku) return null;
  const days = Number(sku.attributes.days ?? sku.attributes.validityDays ?? 1);
  const data =
    sku.attributes.data ??
    (sku.attributes.dataGb ? `${sku.attributes.dataGb}GB` : "按套餐说明");
  const region: Product["region"] = item.destination.includes("欧洲")
    ? "欧洲"
    : "亚洲";
  return {
    id: item.id,
    skuId: sku.id,
    slug: item.slug,
    title: item.title,
    destination: item.destination,
    region,
    kind: item.kind,
    image: publicAsset(item.image || "/images/hero-rome.webp"),
    priceMinor: sku.priceMinor,
    ...(sku.compareAtPriceMinor === null
      ? {}
      : { compareAtMinor: sku.compareAtPriceMinor }),
    rating: 0,
    soldLabel: "0",
    days: [days],
    data: [data],
    network: "网络与覆盖见商品说明",
    inStock: sku.available > 0,
  };
}
