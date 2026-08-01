"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, DeviceMobile, Heart, ShieldCheck, ShoppingCart, Star, WifiHigh } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { formatMoney, type Product } from "@/data/products";
import { useCommerceStore } from "@/store/commerce-store";

export function ProductDetail({ product }: { product: Product }) {
  const router=useRouter();
  const [days, setDays] = useState(product.days[0] ?? 5); const [data, setData] = useState(product.data[0] ?? "5GB");
  const { addToCart, favorites, toggleFavorite, markViewed } = useCommerceStore();
  useEffect(() => markViewed(product.id), [markViewed, product.id]);
  const favorite = favorites.includes(product.id);
  const add = () => { addToCart({ productId: product.id, quantity: 1, days, data }); toast.success("已加入购物车，库存将在结算时再次锁定"); };
  return <PageShell><main className="container-shell py-6"><div className="mb-5 text-sm quiet">首页 / {product.region} / {product.title}</div><div className="grid gap-8 lg:grid-cols-2">
    <div className="surface relative aspect-[4/3] overflow-hidden rounded-2xl"><Image src={product.image} alt={product.title} fill priority className="object-cover" /></div>
    <section><div className="flex items-start justify-between gap-4"><div><span className="rounded bg-[var(--forest-wash)] px-2 py-1 text-xs font-semibold text-[var(--forest)]">{product.kind === "ESIM" ? "eSIM 即时交付" : "实体卡 · 顺丰发货"}</span><h1 className="mt-3 text-3xl font-black">{product.title}</h1><p className="mt-2 flex items-center gap-1 text-sm"><Star size={16} weight="fill" className="text-amber-500" /><b>{product.rating}</b><span className="quiet">· {product.soldLabel} 已售 · 96% 好评</span></p></div><button onClick={() => toggleFavorite(product.id)} className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line)]" aria-label="收藏"><Heart size={22} weight={favorite ? "fill" : "regular"} className={favorite ? "text-red-500" : ""} /></button></div>
    <div className="mt-6 rounded-xl bg-[var(--forest-wash)] p-5"><span className="price text-3xl font-black">{formatMoney(product.priceMinor)}</span><span className="ml-1 text-sm quiet">起</span>{product.compareAtMinor && <del className="ml-3 quiet">{formatMoney(product.compareAtMinor)}</del>}<p className="mt-2 text-sm">价格透明 · 不含隐藏费用 · 支持退款规则预览</p></div>
    <Choice label="使用天数" values={product.days.map(String)} value={String(days)} onChange={(value) => setDays(Number(value))} suffix="天" /><Choice label="流量套餐" values={product.data} value={data} onChange={setData} />
    <div className="mt-6 grid grid-cols-2 gap-3 text-sm"><p className="surface flex items-center gap-2 rounded-lg p-3"><WifiHigh size={20} />网络：{product.network}</p><p className="surface flex items-center gap-2 rounded-lg p-3"><CheckCircle size={20} className="text-[var(--forest)]" />库存：{product.inStock ? "可立即购买" : "暂时缺货"}</p><p className="surface flex items-center gap-2 rounded-lg p-3"><DeviceMobile size={20} />兼容设备可下单前检查</p><p className="surface flex items-center gap-2 rounded-lg p-3"><ShieldCheck size={20} />支付与领取全程审计</p></div>
    <div className="sticky bottom-20 mt-7 flex gap-3 rounded-xl bg-[var(--surface)] py-3 lg:static"><button type="button" onClick={add} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--forest)] py-3.5 font-bold text-white"><ShoppingCart size={20} weight="bold" />加入购物车</button><button type="button" onClick={() => { addToCart({ productId: product.id, quantity: 1, days, data }); router.push("/checkout"); }} className="flex-1 rounded-lg border border-[var(--forest)] py-3.5 font-bold text-[var(--forest)]">立即购买</button></div>
  </section></div>
  <section className="surface mt-8 rounded-2xl p-6"><h2 className="text-xl font-bold">激活与使用说明</h2><div className="mt-4 grid gap-5 md:grid-cols-3"><Info n="01" title="购买前确认设备" text="在设置中确认设备支持 eSIM 且未被运营商锁定。"/><Info n="02" title="抵达后激活" text="登录订单中心完成二次验证后安全领取二维码。"/><Info n="03" title="按规则计时" text="不同套餐从安装或首次连接当地网络起计时，以订单快照为准。"/></div></section></main></PageShell>;
}
function Choice({ label, values, value, onChange, suffix = "" }: { label: string; values: string[]; value: string; onChange: (v: string) => void; suffix?: string }) { return <div className="mt-6"><b className="text-sm">{label}</b><div className="mt-2 flex flex-wrap gap-2">{values.map((item) => <button key={item} onClick={() => onChange(item)} className={`rounded-lg border px-4 py-2 text-sm ${value === item ? "border-[var(--forest)] bg-[var(--forest-wash)] font-semibold text-[var(--forest)]" : "border-[var(--line)]"}`}>{item}{suffix}</button>)}</div></div>; }
function Info({ n, title, text }: { n: string; title: string; text: string }) { return <div className="flex gap-3"><span className="font-black text-[var(--forest)]">{n}</span><span><b>{title}</b><p className="mt-1 text-sm quiet">{text}</p></span></div>; }
