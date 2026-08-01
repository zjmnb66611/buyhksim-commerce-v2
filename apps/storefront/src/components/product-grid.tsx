"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Heart, ShoppingCart, Star } from "@phosphor-icons/react";
import { toast } from "sonner";
import { formatMoney, products, type Product } from "@/data/products";
import { useCommerceStore } from "@/store/commerce-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTranslations } from "@/hooks/use-translations";

export function ProductGrid({ query, category }: { query: string; category: string }) {
  const { t } = useTranslations();
  const [kind, setKind] = useState<"ALL" | Product["kind"]>("ALL");
  const [sort, setSort] = useState("recommended");
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = products.filter((p) => (kind === "ALL" || p.kind === kind) && (!term || `${p.title} ${p.destination} ${p.network} ${t(p.title)} ${t(p.destination)} ${t(p.region)}`.toLowerCase().includes(term)) && (!category || category === "热门目的地" || category === "亚洲" && p.region === "亚洲" || category === "欧洲" && p.region === "欧洲" || category === p.kind));
    return [...filtered].sort((a, b) => sort === "priceLow" ? a.priceMinor - b.priceMinor : sort === "rating" ? b.rating - a.rating : b.soldLabel.localeCompare(a.soldLabel));
  }, [query, category, kind, sort, t]);

  return <section id="products" className="mt-8 scroll-mt-36">
    <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h2 className="text-2xl font-black">{t("精选套餐")} <span className="ml-2 text-sm font-normal quiet">{t("高速稳定，放心出行")}</span></h2>{query && <p className="mt-1 text-sm quiet">“{query}” {t("共找到 {count} 个套餐", { count: visible.length })}</p>}</div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">{[["ALL","全部"],["ESIM","eSIM 即买即用"],["PHYSICAL_SIM","实体卡 (SIM)"]].map(([value,label]) => <button key={value} onClick={() => setKind(value as typeof kind)} className={`rounded-md px-4 py-2 text-sm ${kind === value ? "bg-[var(--forest-wash)] font-semibold text-[var(--forest)]" : "quiet"}`}>{t(label ?? "")}</button>)}</div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t("排序")} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"><option value="recommended">{t("推荐排序")}</option><option value="priceLow">{t("价格从低到高")}</option><option value="rating">{t("评分最高")}</option></select>
      </div>
    </div>
    {visible.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="surface rounded-xl p-12 text-center"><p className="font-semibold">{t("暂未找到匹配套餐")}</p><p className="mt-2 text-sm quiet">{t("尝试更换目的地、卡类型或搜索关键词。")}</p></div>}
  </section>;
}

function ProductCard({ product }: { product: Product }) {
  const { t, intlLocale } = useTranslations();
  const hydrated = useHydrated();
  const { favorites, toggleFavorite, addToCart, markViewed } = useCommerceStore();
  const favorite = hydrated && favorites.includes(product.id);
  const productTitle = t(product.title);
  const add = () => { addToCart({ productId: product.id, quantity: 1, days: product.days[0] ?? 5, data: product.data[0] ?? "5GB" }); toast.success(t("{title} 已加入购物车", { title: productTitle })); };
  return <article className="group surface overflow-hidden rounded-xl transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow)]">
    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
      <Link href={`/products/${product.slug}`} onClick={() => markViewed(product.id)}><Image src={product.image} alt={t("{destination}上网套餐", { destination: t(product.destination) })} fill sizes="(max-width: 640px) 50vw, 260px" className="object-cover transition duration-500 group-hover:scale-[1.035]" /></Link>
      <span className={`absolute left-3 top-3 rounded-md px-2 py-1 text-[11px] font-semibold text-white ${product.kind === "ESIM" ? "bg-[var(--forest)]" : "bg-amber-600"}`}>{t(product.kind === "ESIM" ? "eSIM 即时交付" : "实体卡 · 顺丰发货")}</span>
      <button onClick={() => toggleFavorite(product.id)} aria-label={t(favorite ? "取消收藏" : "收藏商品")} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-slate-800 shadow"><Heart size={18} weight={favorite ? "fill" : "regular"} className={favorite ? "text-red-500" : ""} /></button>
    </div>
    <div className="p-3">
      <Link href={`/products/${product.slug}`} onClick={() => markViewed(product.id)} className="font-bold leading-snug hover:text-[var(--forest)]">{productTitle}</Link>
      <p className="mt-1 truncate text-xs quiet">{product.network} {t("全境覆盖")}</p>
      <div className="mt-2 flex gap-1.5">{[`${product.days[0]} ${t("天")}`, t(product.data[0] ?? "")].map((tag) => <span key={tag} className="rounded border border-[var(--line)] px-2 py-0.5 text-[11px]">{tag}</span>)}</div>
      <p className="mt-2 flex items-center gap-1 text-xs"><Star size={13} weight="fill" className="text-amber-500" /><b>{product.rating}</b><span className="quiet">｜{product.soldLabel} {t("已售")}</span></p>
      <p className="mt-2 text-xs font-medium text-[var(--forest)]">{t(product.inStock ? "有货" : "暂时缺货")}</p>
      <div className="mt-2 flex items-end justify-between gap-2"><div><span className="price text-xl font-black">{formatMoney(product.priceMinor, intlLocale)}</span><small className="ml-1 quiet">{t("起")}</small>{product.compareAtMinor && <del className="ml-2 text-xs quiet">{formatMoney(product.compareAtMinor, intlLocale)}</del>}</div><button onClick={add} disabled={!product.inStock} aria-label={t("将{title}加入购物车", { title: productTitle })} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--forest)] text-white transition hover:bg-[var(--forest-strong)] disabled:opacity-50"><ShoppingCart size={18} weight="bold" /></button></div>
    </div>
  </article>;
}
