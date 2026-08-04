import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { StorefrontProvider } from "@/components/storefront-provider";

export const metadata: Metadata = {
  title: "BUYHKSIM｜全球 SIM 与 eSIM 商城",
  description: "面向旅行与企业采购的 eSIM 和实体 SIM 商城，商品覆盖、价格、库存与交付规则以页面实时信息为准。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <StorefrontProvider>{children}</StorefrontProvider>
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}
