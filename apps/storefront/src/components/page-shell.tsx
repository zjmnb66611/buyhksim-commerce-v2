"use client";
import { useRouter } from "next/navigation";
import { Header } from "./header";
import { CartDrawer } from "./cart-drawer";
import { MobileNav } from "./mobile-nav";
export function PageShell({ children }: { children: React.ReactNode }) { const router = useRouter(); return <><Header onSearch={(query) => router.push(`/?q=${encodeURIComponent(query)}#products`)} />{children}<CartDrawer /><MobileNav /></>; }
