export type Product = {
  id: string;
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
  { id: "p-hk", slug: "hong-kong-5g-esim", title: "香港 5G eSIM", destination: "香港", region: "亚洲", kind: "ESIM", image: "/images/hong-kong.webp", priceMinor: 5800, compareAtMinor: 7200, rating: 4.8, soldLabel: "1.2万+", days: [3, 5, 7], data: ["3GB", "5GB", "10GB"], network: "CSL / 3HK", inStock: true, badge: "热销" },
  { id: "p-jp", slug: "japan-5g-esim", title: "日本 5G eSIM", destination: "日本", region: "亚洲", kind: "ESIM", image: "/images/japan.webp", priceMinor: 6800, compareAtMinor: 8800, rating: 4.8, soldLabel: "1.6万+", days: [5, 7, 10, 15], data: ["5GB", "10GB", "20GB"], network: "Docomo / KDDI", inStock: true, badge: "即买即用" },
  { id: "p-eu", slug: "europe-33-countries-esim", title: "欧洲多国 33 国 eSIM", destination: "欧洲 33 国", region: "欧洲", kind: "ESIM", image: "/images/europe.webp", priceMinor: 19800, compareAtMinor: 23800, rating: 4.7, soldLabel: "9800+", days: [10, 15, 30], data: ["10GB", "20GB", "30GB"], network: "多国优选网络", inStock: true, badge: "覆盖广" },
  { id: "p-sg", slug: "singapore-5g-esim", title: "新加坡 5G eSIM", destination: "新加坡", region: "亚洲", kind: "ESIM", image: "/images/singapore.webp", priceMinor: 4800, compareAtMinor: 6500, rating: 4.9, soldLabel: "6300+", days: [3, 5, 7], data: ["3GB", "5GB", "10GB"], network: "Singtel / StarHub", inStock: true, badge: "高评分" },
  { id: "p-th", slug: "thailand-8-day-sim", title: "泰国 8 天上网卡", destination: "泰国", region: "亚洲", kind: "PHYSICAL_SIM", image: "/images/thailand.webp", priceMinor: 3900, compareAtMinor: 4900, rating: 4.7, soldLabel: "1.2万+", days: [8, 15], data: ["15GB", "30GB", "不限量"], network: "AIS / True 5G", inStock: true, badge: "顺丰包邮" },
];

export const formatMoney = (minor: number, locale = "zh-CN") =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "CNY", minimumFractionDigits: 0 }).format(minor / 100);
