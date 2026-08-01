"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { CategorySidebar } from "@/components/category-sidebar";
import { Hero } from "@/components/hero";
import { SmartFinder, type FinderValue } from "@/components/smart-finder";
import { ProductGrid } from "@/components/product-grid";
import { CartDrawer } from "@/components/cart-drawer";
import { Assurance } from "@/components/assurance";
import { MobileNav } from "@/components/mobile-nav";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const recommend = (value: FinderValue) => { setQuery(value.destination); setCategory(value.kind); document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); };
  return <>
    <Header onSearch={setQuery} />
    <main className="container-shell py-5">
      <div className="flex items-start gap-7"><CategorySidebar onCategory={(value) => { setCategory(value); setQuery(""); }} /><div className="min-w-0 flex-1"><Hero /><SmartFinder onRecommend={recommend} /><ProductGrid query={query} category={category} /></div></div>
    </main>
    <Assurance /><CartDrawer /><MobileNav />
  </>;
}
