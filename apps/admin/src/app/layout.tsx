import type { Metadata, Viewport } from "next";
import { AdminShell } from "@/components/admin-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "BUYHKSIM 商家管理后台",
  description: "BUYHKSIM 商品、订单、库存、营销与财务运营后台",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { colorScheme: "light dark", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f3f6f4" }, { media: "(prefers-color-scheme: dark)", color: "#07110e" }] };

const themeBootstrap = `(()=>{try{const t=localStorage.getItem("buyhksim-admin-theme")||"system";const d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch{document.documentElement.dataset.theme="light"}})()`;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN" suppressHydrationWarning>
    <head><script id="admin-theme-bootstrap" dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
    <body><AdminShell>{children}</AdminShell></body>
  </html>;
}
