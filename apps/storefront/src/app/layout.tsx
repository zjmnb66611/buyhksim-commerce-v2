import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { StorefrontProvider } from "@/components/storefront-provider";

export const metadata: Metadata = {
  title: "BUYHKSIM｜全球 SIM 与 eSIM 商城",
  description: "全球 200+ 国家和地区的 eSIM 与实体 SIM 卡，透明价格、安全支付、中文服务。",
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
