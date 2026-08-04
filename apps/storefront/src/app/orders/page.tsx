"use client";

import { useEffect,useMemo,useState } from "react";
import { Copy,Package,QrCode } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { useTranslations } from "@/hooks/use-translations";
import { apiRequest } from "@/lib/api-client";
import { formatMoney } from "@/data/products";

type Order={id:string;orderNo:string;status:string;currency:string;totalMinor:number;createdAt:string;items:Array<{id:string;title:string;sku:{title?:string;kind?:string};quantity:number;totalMinor:number}>};
const labels:Record<string,string>={PENDING_PAYMENT:"待支付",PAID:"待交付",FULFILLING:"配送中",COMPLETED:"已完成",CLOSED:"已关闭",AFTER_SALE:"售后中",REFUNDED:"已退款"};

export default function OrdersPage(){
  const {t,intlLocale}=useTranslations();const [active,setActive]=useState("全部");const [orders,setOrders]=useState<Order[]>([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{void apiRequest<{ok:true;data:Order[]}>("/orders").then((payload)=>setOrders(payload.data)).catch((error)=>toast.error(error instanceof Error?error.message:t("请先登录后查看订单"))).finally(()=>setLoading(false))},[t]);
  const visible=useMemo(()=>orders.filter((order)=>active==="全部"||labels[order.status]===active),[orders,active]);
  const copy=async(no:string)=>{try{await navigator.clipboard.writeText(no);toast.success(t("订单号已复制"))}catch{toast.error(t("浏览器未授权剪贴板，请手动复制"))}};
  return <PageShell><main className="container-shell py-8"><h1 className="text-3xl font-black">{t("我的订单")}</h1><p className="mt-2 quiet">{t("查看支付、交付、物流与售后状态。")}</p><div className="mt-6 flex gap-2 overflow-x-auto pb-1">{["全部","待支付","待交付","配送中","已完成","售后中","已退款","已关闭"].map((tab)=><button type="button" key={tab} onClick={()=>setActive(tab)} className={`shrink-0 rounded-lg px-4 py-2 text-sm ${active===tab?"bg-[var(--forest)] text-white":"surface"}`}>{t(tab)}</button>)}</div><div className="mt-5 space-y-4">{visible.map((order)=><article key={order.id} className="surface rounded-xl p-5"><div className="flex flex-wrap justify-between gap-3 border-b border-[var(--line)] pb-3 text-sm"><span>{t("订单号")} {order.orderNo} <button type="button" onClick={()=>void copy(order.orderNo)} aria-label={t("复制订单号")} className="ml-1 align-middle"><Copy size={14}/></button></span><span className="quiet">{new Intl.DateTimeFormat(intlLocale,{dateStyle:"medium",timeStyle:"short"}).format(new Date(order.createdAt))}</span></div><div className="space-y-3 pt-4">{order.items.map((item)=>{const esim=item.sku?.kind==="ESIM";return <div key={item.id} className="flex items-center gap-3">{esim?<QrCode size={34}/>:<Package size={34}/>}<div className="min-w-0 flex-1"><b>{item.title}</b><p className="truncate text-sm quiet">{item.sku?.title??"SKU"} × {item.quantity}</p></div><span>{formatMoney(item.totalMinor,intlLocale)}</span></div>})}</div><div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-4"><span className="rounded-full bg-[var(--forest-wash)] px-3 py-1 text-sm font-semibold text-[var(--forest)]">{t(labels[order.status]??order.status)}</span><b>{formatMoney(order.totalMinor,intlLocale)}</b></div></article>)}{loading&&<div className="surface rounded-xl p-12 text-center quiet">{t("正在加载订单…")}</div>}{!loading&&!visible.length&&<div className="surface rounded-xl p-12 text-center quiet">{t("当前分类暂无订单")}</div>}</div></main></PageShell>
}
