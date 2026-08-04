"use client";
import { Globe, Headset, Question, ShieldCheck, WifiHigh } from "@phosphor-icons/react";
import { useTranslations } from "@/hooks/use-translations";
const items = [[Globe,"商品覆盖","以商品详情为准"],[ShieldCheck,"服务端计价","费用在结算页展示"],[ShieldCheck,"支付确认","以服务端回调为准"],[WifiHigh,"网络信息","以商品页公示为准"],[Question,"售后规则","按公示规则申请"],[Headset,"客户支持","响应时间见服务公告"]] as const;
export function Assurance() { const { t } = useTranslations(); return <section id="support" className="mt-8 border-y border-[var(--line)] bg-[var(--surface)]"><div className="container-shell grid grid-cols-2 py-5 sm:grid-cols-3 lg:grid-cols-6">{items.map(([Icon,title,desc], index) => <div key={title} className={`flex items-center gap-3 px-4 py-3 ${index ? "lg:border-l lg:border-[var(--line)]" : ""}`}><Icon size={30} /><span><b className="block text-sm">{t(title)}</b><small className="quiet">{t(desc)}</small></span></div>)}</div></section>; }
