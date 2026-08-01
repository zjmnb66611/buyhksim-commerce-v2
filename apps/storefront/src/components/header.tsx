"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Heart, Headset, MagnifyingGlass, MapPin, Package, ShoppingCart, SimCard, Sun, UserCircle } from "@phosphor-icons/react";
import { messages } from "@buyhksim/i18n";
import { useCommerceStore } from "@/store/commerce-store";
import { useHydrated } from "@/hooks/use-hydrated";

export function Header({ onSearch }: { onSearch: (query: string) => void }) {
  const hydrated = useHydrated();
  const [query, setQuery] = useState("");
  const { cart, favorites, locale, theme, setLocale, setTheme, setCartOpen } = useCommerceStore();
  const copy = useMemo(() => messages[locale], [locale]);
  const cartCount = hydrated ? cart.reduce((sum, line) => sum + line.quantity, 0) : 0;

  const submit = (event: React.FormEvent) => { event.preventDefault(); onSearch(query); document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <>
      <div className="bg-[#071526] text-white text-[12px]">
        <div className="container-shell flex min-h-9 items-center justify-between gap-2 py-1 sm:gap-4">
          <div className="hidden items-center gap-7 md:flex">
            <span className="flex items-center gap-1.5"><MapPin size={15} weight="bold" />全球覆盖 200+ 国家和地区</span>
            <span className="flex items-center gap-1.5"><SimCard size={15} weight="bold" />eSIM 即买即用</span>
            <span className="flex items-center gap-1.5"><Package size={15} weight="bold" />顺丰配送，覆盖热门目的地</span>
            <span className="flex items-center gap-1.5"><Headset size={15} weight="bold" />7×24 小时中文客服</span>
          </div>
          <span className="hidden sm:inline md:hidden">全球上网卡 · 安全支付 · 中文服务</span>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
            <label className="flex items-center gap-1">
              <Sun size={14} /><span className="sr-only">主题</span>
              <select aria-label="主题" value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)} className="max-w-[78px] bg-transparent text-[11px] outline-none sm:max-w-none sm:text-xs">
                <option className="text-slate-900" value="system">跟随系统</option><option className="text-slate-900" value="light">浅色</option><option className="text-slate-900" value="dark">深色</option>
              </select>
            </label>
            <select aria-label="语言" value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)} className="max-w-[76px] bg-transparent text-[11px] outline-none sm:max-w-none sm:text-xs">
              <option className="text-slate-900" value="zh-CN">简体中文</option><option className="text-slate-900" value="zh-HK">繁體中文</option><option className="text-slate-900" value="en">English</option>
            </select>
            <span className="hidden sm:inline">CNY ¥</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color:var(--surface)]/95 backdrop-blur-md">
        <div className="container-shell flex min-h-[72px] items-center gap-3 py-3 sm:gap-5 xl:gap-7">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="BUYHKSIM 首页">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--forest)] text-lg font-black text-white shadow-md">BH</span>
            <span className="hidden sm:block"><strong className="block text-xl tracking-[0.12em]">BUYHKSIM</strong><small className="quiet">Trust Ledger Marketplace</small></span>
          </Link>
          <nav className="hidden shrink-0 items-center gap-6 text-sm font-semibold xl:flex" aria-label="主导航">
            <a href="#products">全球上网卡</a><a href="#products">eSIM</a><a href="#products">实体 SIM 卡</a><a href="#finder">目的地</a><Link href="/business">企业采购</Link>
          </nav>
          <form onSubmit={submit} className="mx-auto flex h-11 min-w-0 flex-1 items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface-soft)] pl-4 focus-within:ring-2 focus-within:ring-[var(--forest)]/25">
            <MagnifyingGlass size={19} className="quiet shrink-0" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" placeholder="搜索目的地、运营商或套餐" aria-label="搜索商品" />
            <button className="mr-1 h-9 shrink-0 rounded-full bg-[var(--forest)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--forest-strong)] sm:px-6 sm:text-sm" type="submit">{copy.search}</button>
          </form>
          <div className="hidden shrink-0 items-center gap-5 lg:flex">
            <Link href="/account" className="text-center text-xs"><UserCircle size={24} className="mx-auto mb-1" />{copy.account}</Link>
            <Link href="/orders" className="text-center text-xs"><Package size={24} className="mx-auto mb-1" />{copy.orders}</Link>
            <Link href="/favorites" className="relative text-center text-xs"><Heart size={24} className="mx-auto mb-1" /><span>{copy.favorite}</span>{hydrated && favorites.length > 0 && <Count value={favorites.length} />}</Link>
            <button onClick={() => setCartOpen(true)} className="relative text-center text-xs"><ShoppingCart size={24} className="mx-auto mb-1" />{copy.cart}{cartCount > 0 && <Count value={cartCount} />}</button>
          </div>
        </div>
      </header>
    </>
  );
}

function Count({ value }: { value: number }) { return <span className="absolute -right-2 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--forest)] px-1 text-[10px] font-bold text-white">{value}</span>; }
