import type { Metadata } from "next"; import { Toaster } from "sonner"; import "./globals.css";
export const metadata: Metadata = { title:"BUYHKSIM 商家管理后台", robots:{index:false,follow:false} };
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}<Toaster richColors position="top-center" /></body></html>}
