"use client";

import { useState } from "react";
import { Buildings, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { useTranslations } from "@/hooks/use-translations";
import { apiRequest } from "@/lib/api-client";

const capabilities = ["批量采购与阶梯报价", "合同及企业发票信息", "员工 eSIM 批量发放", "独立企业订单与成本中心", "专属客户经理与工单", "交付、激活和使用报表"];

export default function BusinessPage() {
  const { t } = useTranslations();
  const [submitted, setSubmitted] = useState("");
  const submit = async(event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try{const payload=await apiRequest<{ok:true;data:{reference:string}}>("/business/inquiries",{method:"POST",body:JSON.stringify({company:String(data.get("company")),email:String(data.get("email")),quantity:Number(data.get("quantity")),requirements:String(data.get("requirements"))})},false);setSubmitted(payload.data.reference);event.currentTarget.reset();toast.success(t("询价已提交"))}catch(error){toast.error(error instanceof Error?error.message:t("询价提交失败，请稍后重试"))}
  };
  return <PageShell><main className="container-shell py-8"><section className="overflow-hidden rounded-2xl bg-[#071526] p-8 text-white md:p-12"><Buildings size={42} /><p className="mt-5 text-sm font-semibold text-emerald-300">BUYHKSIM FOR BUSINESS</p><h1 className="mt-2 max-w-3xl text-4xl font-black">{t("企业全球连接与批量采购")}</h1><p className="mt-4 max-w-2xl text-white/70">{t("提交需求后由企业服务团队确认可用范围、报价、合同与交付方式。")}</p></section><div className="mt-7 grid gap-7 lg:grid-cols-[1fr_480px]"><section className="surface rounded-xl p-6"><h2 className="text-xl font-bold">{t("可申请的企业服务")}</h2><ul className="mt-5 grid gap-4 sm:grid-cols-2">{capabilities.map((item) => <li key={item} className="flex gap-2"><CheckCircle size={20} weight="fill" className="text-[var(--forest)]" />{t(item)}</li>)}</ul><p className="mt-5 text-sm quiet">{t("具体服务能力和时效以书面确认结果为准。")}</p></section><form onSubmit={(event)=>void submit(event)} className="surface rounded-xl p-6"><h2 className="text-xl font-bold">{t("提交采购询价")}</h2>{submitted && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{t("已受理，询价编号：")}<b>{submitted}</b></p>}<div className="mt-4 grid gap-3"><input name="company" required minLength={2} maxLength={160} placeholder={t("企业名称")} className="rounded-lg border border-[var(--line)] bg-transparent p-3"/><input name="email" required type="email" maxLength={254} placeholder={t("工作邮箱")} className="rounded-lg border border-[var(--line)] bg-transparent p-3"/><input name="quantity" required type="number" min="10" max="100000" placeholder={t("预计采购数量")} className="rounded-lg border border-[var(--line)] bg-transparent p-3"/><textarea name="requirements" required minLength={10} maxLength={1000} placeholder={t("目的地、周期和交付要求")} className="min-h-28 rounded-lg border border-[var(--line)] bg-transparent p-3"/><button className="rounded-lg bg-[var(--forest)] py-3 font-bold text-white">{t("提交询价")}</button></div></form></div></main></PageShell>;
}
