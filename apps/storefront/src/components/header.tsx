"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Headset, MagnifyingGlass, MapPin, Package, ShoppingCart, SimCard, Sun, UserCircle } from "@phosphor-icons/react";
import { useCommerceStore } from "@/store/commerce-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTranslations } from "@/hooks/use-translations";

export function Header({ onSearch }: { onSearch: (query: string) => void }) {
  const hydrated = useHydrated();
  const { t } = useTranslations();
  const [query, setQuery] = useState("");
  const { cart, favorites, locale, theme, setLocale, setTheme, setCartOpen } = useCommerceStore();
  const cartCount = hydrated ? cart.reduce((sum, line) => sum + line.quantity, 0) : 0;

  const submit = (event: React.FormEvent) => { event.preventDefault(); onSearch(query); document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <>
      <div className="bg-[#071526] text-white text-[12px]">
        <div className="container-shell flex min-h-9 items-center justify-between gap-2 py-1 sm:gap-4">
          <div className="hidden items-center gap-7 md:flex">
            <span className="flex items-center gap-1.5"><MapPin size={15} weight="bold" />{t("热门目的地与套餐持续更新")}</span>
            <span className="flex items-center gap-1.5"><SimCard size={15} weight="bold" />{t("eSIM 在线选购")}</span>
            <span className="flex items-center gap-1.5"><Package size={15} weight="bold" />{t("实体卡配送以结算页为准")}</span>
            <span className="flex items-center gap-1.5"><Headset size={15} weight="bold" />{t("客服服务时间以公告为准")}</span>
          </div>
          <span className="hidden sm:inline md:hidden">{t("全球上网卡 · 安全支付 · 中文服务")}</span>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
            <label className="flex items-center gap-1">
              <Sun size={14} /><span className="sr-only">{t("主题")}</span>
              <select aria-label={t("主题")} value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)} className="max-w-[78px] bg-transparent text-[11px] outline-none sm:max-w-none sm:text-xs">
                <option className="text-slate-900" value="system">{t("跟随系统")}</option><option className="text-slate-900" value="light">{t("浅色")}</option><option className="text-slate-900" value="dark">{t("深色")}</option>
              </select>
            </label>
            <select aria-label={t("语言")} value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)} className="max-w-[76px] bg-transparent text-[11px] outline-none sm:max-w-none sm:text-xs">
              <option className="text-slate-900" value="zh-CN">简体中文</option><option className="text-slate-900" value="zh-HK">繁體中文</option><option className="text-slate-900" value="en">English</option>
            </select>
            <span className="hidden sm:inline">CNY ¥</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color:var(--surface)]/95 backdrop-blur-md">
        <div className="container-shell flex min-h-[72px] items-center gap-3 py-3 sm:gap-5 xl:gap-7">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={`BUYHKSIM ${t("首页")}`}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--forest)] text-lg font-black text-white shadow-md">BH</span>
            <span className="hidden sm:block"><strong className="block text-xl tracking-[0.12em]">BUYHKSIM</strong><small className="quiet">Trust Ledger Marketplace</small></span>
          </Link>
          <nav className="hidden shrink-0 items-center gap-6 text-sm font-semibold xl:flex" aria-label={t("主导航")}>
            <a href="#products">{t("全球上网卡")}</a><a href="#products">eSIM</a><a href="#products">{t("实体 SIM 卡")}</a><a href="#finder">{t("目的地")}</a><Link href="/business">{t("企业采购")}</Link>
          </nav>
          <form onSubmit={submit} className="mx-auto flex h-11 min-w-0 flex-1 items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface-soft)] pl-4 focus-within:ring-2 focus-within:ring-[var(--forest)]/25">
            <MagnifyingGlass size={19} className="quiet shrink-0" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" placeholder={t("搜索目的地、运营商或套餐")} aria-label={t("搜索商品")} />
            <button className="mr-1 h-9 shrink-0 rounded-full bg-[var(--forest)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--forest-strong)] sm:px-6 sm:text-sm" type="submit">{t("搜索")}</button>
          </form>
          <div className="hidden shrink-0 items-center gap-5 lg:flex">
            <Link href="/account" className="text-center text-xs"><UserCircle size={24} className="mx-auto mb-1" />{t("登录/注册")}</Link>
            <Link href="/orders" className="text-center text-xs"><Package size={24} className="mx-auto mb-1" />{t("我的订单")}</Link>
            <Link href="/favorites" className="relative text-center text-xs"><Heart size={24} className="mx-auto mb-1" /><span>{t("收藏夹")}</span>{hydrated && favorites.length > 0 && <Count value={favorites.length} />}</Link>
            <button onClick={() => setCartOpen(true)} className="relative text-center text-xs"><ShoppingCart size={24} className="mx-auto mb-1" />{t("购物车")}{cartCount > 0 && <Count value={cartCount} />}</button>
          </div>
        </div>
      </header>
    </>
  );
}

function Count({ value }: { value: number }) { return <span className="absolute -right-2 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--forest)] px-1 text-[10px] font-bold text-white">{value}</span>; }
