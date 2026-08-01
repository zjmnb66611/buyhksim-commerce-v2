"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash, X } from "@phosphor-icons/react";
import { formatMoney, products } from "@/data/products";
import { useCommerceStore } from "@/store/commerce-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTranslations } from "@/hooks/use-translations";

export function CartDrawer() {
  const hydrated = useHydrated();
  const { t, intlLocale } = useTranslations();
  const { cart, cartOpen, setCartOpen, setQuantity, removeFromCart } = useCommerceStore();
  if (!hydrated) return null;
  const items = cart.flatMap((line) => { const product = products.find((p) => p.id === line.productId); return product ? [{ ...line, product }] : []; });
  const total = items.reduce((sum, item) => sum + item.product.priceMinor * item.quantity, 0);
  return <div className={`fixed inset-0 z-50 transition ${cartOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!cartOpen}>
    <button aria-label={t("关闭购物车")} onClick={() => setCartOpen(false)} className={`absolute inset-0 bg-slate-950/45 transition-opacity ${cartOpen ? "opacity-100" : "opacity-0"}`} />
    <aside className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl transition-transform duration-300 ${cartOpen ? "translate-x-0" : "translate-x-full"}`} role="dialog" aria-modal="true" aria-label={t("购物车")}>
      <div className="flex items-center justify-between border-b border-[var(--line)] p-5"><h2 className="flex items-center gap-2 text-xl font-bold"><ShoppingCart size={23} />{t("购物车")} <span className="text-sm font-normal quiet">({items.length})</span></h2><button onClick={() => setCartOpen(false)} aria-label={t("关闭")}><X size={24} /></button></div>
      <div className="flex-1 overflow-y-auto p-5">{items.length ? <div className="space-y-4">{items.map((item) => <div key={`${item.productId}-${item.days}-${item.data}`} className="flex gap-3 border-b border-[var(--line)] pb-4"><div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg"><Image src={item.product.image} alt="" fill className="object-cover" /></div><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{t(item.product.title)}</h3><p className="mt-1 text-xs quiet">{item.days} {t("天")} · {t(item.data)}</p><p className="mt-1 font-bold price">{formatMoney(item.product.priceMinor, intlLocale)}</p><div className="mt-2 flex items-center justify-between"><div className="flex items-center rounded-md border border-[var(--line)]"><button aria-label={t("减少数量")} onClick={() => setQuantity(item.productId, item.quantity - 1)} className="p-1.5"><Minus size={14} /></button><span className="min-w-7 text-center text-sm">{item.quantity}</span><button aria-label={t("增加数量")} onClick={() => setQuantity(item.productId, item.quantity + 1)} className="p-1.5"><Plus size={14} /></button></div><button onClick={() => removeFromCart(item.productId)} className="text-sm quiet hover:text-red-500" aria-label={t("移除商品")}><Trash size={17} /></button></div></div></div>)}</div> : <div className="grid h-full place-items-center text-center"><div><ShoppingCart size={52} className="mx-auto quiet" /><h3 className="mt-4 font-bold">{t("购物车还是空的")}</h3><p className="mt-2 text-sm quiet">{t("选好目的地套餐后，可在这里统一结算。")}</p><button onClick={() => setCartOpen(false)} className="mt-5 rounded-lg bg-[var(--forest)] px-5 py-2.5 font-semibold text-white">{t("继续选购")}</button></div></div>}</div>
      {items.length > 0 && <div className="border-t border-[var(--line)] p-5"><div className="mb-4 flex items-center justify-between"><span>{t("商品合计")}</span><strong className="price text-2xl">{formatMoney(total, intlLocale)}</strong></div><p className="mb-4 text-xs quiet">{t("最终价格、优惠与库存将在结算页由服务端重新校验。")}</p><Link href="/checkout" onClick={() => setCartOpen(false)} className="block rounded-lg bg-[var(--forest)] py-3.5 text-center font-bold text-white hover:bg-[var(--forest-strong)]">{t("安全结算")}</Link></div>}
    </aside>
  </div>;
}
