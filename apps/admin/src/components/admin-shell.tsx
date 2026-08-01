"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChartLineUp, Coins, Gear, Headset, List, Package, PaintBrush, ShieldCheck, ShoppingBag, SignOut, Tag, Truck, UsersThree, Wallet, X } from "@phosphor-icons/react";
import { Toaster, toast } from "sonner";
import { normalizeAdminPath } from "@/lib/admin-utils";

type Theme = "system" | "light" | "dark";

const groups = [
  { title: "交易运营", items: [[ChartLineUp, "经营概览", "/"], [ShoppingBag, "商品管理", "/products"], [PaintBrush, "店铺内容", "/content"], [Package, "订单管理", "/orders"], [Truck, "库存与仓库", "/inventory"], [Headset, "售后与工单", "/after-sales"]] },
  { title: "增长与客户", items: [[UsersThree, "用户与 CRM", "/customers"], [Tag, "营销与会员", "/marketing"], [Coins, "分销佣金", "/distribution"]] },
  { title: "财务与系统", items: [[Wallet, "财务对账", "/finance"], [ShieldCheck, "权限与审计", "/security"], [Gear, "系统设置", "/settings"]] },
] as const;

function resolveDarkTheme(theme: Theme) {
  return theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = normalizeAdminPath(usePathname());
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const [isNavigating, startNavigation] = useTransition();

  useEffect(() => {
    const saved = localStorage.getItem("buyhksim-admin-theme");
    if (saved === "light" || saved === "dark" || saved === "system") setTheme(saved);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = resolveDarkTheme(theme) ? "dark" : "light"; };
    localStorage.setItem("buyhksim-admin-theme", theme);
    apply();
    if (theme === "system") media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const navigate = useCallback((href: string) => {
    setMenuOpen(false);
    if (normalizeAdminPath(href) === pathname) return;
    startNavigation(() => router.push(href));
  }, [pathname, router]);

  const logout = () => {
    if (!window.confirm("确认退出当前管理会话？未提交的表单内容可能丢失。")) return;
    localStorage.removeItem("buyhksim-admin-access-token");
    toast.success("管理会话已安全退出");
  };

  return <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
    <a href="#admin-content" className="fixed left-3 top-3 z-[90] -translate-y-24 rounded-lg bg-[var(--action)] px-4 py-2 text-sm font-semibold text-white focus:translate-y-0">跳到主要内容</a>
    <div className="route-progress" data-active={isNavigating} aria-hidden="true" />
    {menuOpen && <button type="button" aria-label="关闭菜单遮罩" className="app-overlay fixed inset-0 z-40 lg:hidden" onClick={() => setMenuOpen(false)} />}
    <Sidebar path={pathname} mobile={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={navigate} />
    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => setMenuOpen(true)} className="secondary-action grid h-10 w-10 shrink-0 place-items-center rounded-lg lg:hidden" aria-label="打开后台导航" aria-expanded={menuOpen}><List size={23} /></button>
          <div className="min-w-0"><p className="truncate text-sm quiet">香港直营店</p><b className="block truncate">运营工作台</b></div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <span className="hidden rounded-full bg-[var(--wash)] px-3 py-1.5 text-xs font-semibold text-[var(--forest)] sm:inline">沙箱环境</span>
          <label className="hidden text-sm md:block"><span className="sr-only">后台主题</span><select aria-label="后台主题" value={theme} onChange={(event) => setTheme(event.target.value as Theme)} className="field-surface rounded-lg border border-[var(--line)] px-2 py-1.5"><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label>
          <span className="hidden text-sm sm:block">运营管理员</span>
          <button type="button" onClick={logout} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-[var(--wash)]" aria-label="退出登录"><SignOut size={20} /></button>
        </div>
      </header>
      <main id="admin-content" tabIndex={-1} className="p-4 sm:p-5 lg:p-8">{children}</main>
    </div>
    <Toaster richColors closeButton position="top-center" theme={theme} toastOptions={{ className: "modal-surface" }} />
  </div>;
}

function Sidebar({ path, mobile, onClose, onNavigate }: { path: string; mobile: boolean; onClose: () => void; onNavigate: (href: string) => void }) {
  return <aside aria-label="后台主导航" className={`${mobile ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-[280px] overflow-y-auto bg-[var(--sidebar)] text-white transition-transform lg:sticky lg:top-0 lg:z-auto lg:block lg:h-screen lg:w-auto lg:translate-x-0`}>
    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#0b6d5b] font-black">BH</span><span className="min-w-0"><b className="block tracking-widest">BUYHKSIM</b><small className="text-white/60">Merchant Console</small></span><button type="button" onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10 lg:hidden" aria-label="关闭后台导航"><X size={22} /></button></div>
    <nav className="p-4">{groups.map((group) => <div key={group.title} className="mb-6"><p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/60">{group.title}</p>{group.items.map(([Icon, label, href]) => {
      const active = path === normalizeAdminPath(href);
      return <Link key={href} href={href} prefetch onClick={(event) => { event.preventDefault(); onNavigate(href); }} aria-current={active ? "page" : undefined} className={`mb-1 flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-white/14 font-semibold text-white" : "text-white/70 hover:bg-white/8 hover:text-white"}`}><Icon size={19} /><span>{label}</span></Link>;
    })}</div>)}</nav>
  </aside>;
}
