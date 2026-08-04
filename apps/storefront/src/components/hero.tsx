"use client";
import Image from "next/image";
import { CheckCircle, Headset, Package, SimCard } from "@phosphor-icons/react";
import { useTranslations } from "@/hooks/use-translations";
import { useEffect,useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { publicAsset } from "@/lib/base-path";

type CmsBody={announcement:string;heroTitle:string;heroSubtitle:string;serviceNote:string;faqTitle:string;faqAnswer:string};

export function Hero() {
  const { t,locale } = useTranslations();const [cms,setCms]=useState<CmsBody|null>(null);
  useEffect(()=>{let active=true;void apiRequest<{ok:true;data:{body:CmsBody}|null}>(`/cms/storefront?locale=${encodeURIComponent(locale)}`,{},false).then((payload)=>{if(active)setCms(payload.data?.body??null)}).catch(()=>{if(active)setCms(null)});return()=>{active=false}},[locale]);
  return <section className="surface relative min-h-[258px] overflow-hidden rounded-xl">
    <Image src={publicAsset("/images/hero-rome.webp")} alt={t("罗马城市与台伯河风景")} fill priority sizes="(max-width: 1024px) 100vw, 1100px" className="object-cover object-center" />
    <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)] via-[color:var(--surface)]/88 to-transparent" />
    <div className="relative z-10 max-w-[760px] px-8 py-9 md:px-10">
      <p className="mb-2 text-sm font-semibold text-[var(--forest)]">{cms?.announcement||"TRUSTED GLOBAL CONNECTIVITY"}</p>
      <h1 className="text-3xl font-black tracking-tight md:text-[40px]">{cms?.heroTitle||t("在线选卡，服务端安全结算")}</h1>
      {cms?.heroSubtitle&&<p className="mt-3 max-w-2xl text-sm quiet">{cms.heroSubtitle}</p>}
      <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-sm quiet"><span className="flex items-center gap-1.5"><CheckCircle weight="fill" className="text-[var(--forest)]" />{t("覆盖范围以商品详情为准")}</span><span className="flex items-center gap-1.5"><CheckCircle weight="fill" className="text-[var(--forest)]" />{t("价格与库存由服务端确认")}</span><span className="flex items-center gap-1.5"><CheckCircle weight="fill" className="text-[var(--forest)]" />{t("客服响应时间以服务公告为准")}</span></div>
      <div className="mt-8 grid max-w-[620px] grid-cols-3 gap-5 text-sm">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)]"><SimCard size={20} /></span><span><b className="block">{t("数字商品")}</b><small className="quiet">{t("交付状态可查询")}</small></span></div>
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)]"><Package size={20} /></span><span><b className="block">{t("实体卡配送")}</b><small className="quiet">{t("配送规则见结算页")}</small></span></div>
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)]"><Headset size={20} /></span><span><b className="block">{t("售后支持")}</b><small className="quiet">{t("按售后规则处理")}</small></span></div>
      </div>
    </div>
  </section>;
}
