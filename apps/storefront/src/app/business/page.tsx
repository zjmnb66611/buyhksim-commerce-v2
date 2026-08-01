"use client";

import { useState } from "react";
import { Buildings, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { useTranslations } from "@/hooks/use-translations";

const capabilities = ["批量采购与阶梯报价", "合同及企业发票信息", "员工 eSIM 批量发放", "独立企业订单与成本中心", "专属客户经理与工单", "交付、激活和使用报表"];

export default function BusinessPage() {
  const { t } = useTranslations();
  const [submitted, setSubmitted] = useState("");
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const inquiry = { id: `RFQ-${Date.now().toString().slice(-8)}`, company: String(data.get("company")), email: String(data.get("email")), quantity: Number(data.get("quantity")), requirements: String(data.get("requirements")), createdAt: new Date().toISOString() };
    try {
      const saved = JSON.parse(localStorage.getItem("buyhksim-business-inquiries") ?? "[]") as unknown[];
      localStorage.setItem("buyhksim-business-inquiries", JSON.stringify([inquiry, ...saved]));
    } catch {}
    setSubmitted(inquiry.id);
    event.currentTarget.reset();
    toast.success(t("询价已提交，企业顾问将在 1 个工作日内联系"));
  };
  return <PageShell><main className="container-shell py-8"><section className="overflow-hidden rounded-2xl bg-[#071526] p-8 text-white md:p-12"><Buildings size={42} /><p className="mt-5 text-sm font-semibold text-emerald-300">BUYHKSIM FOR BUSINESS</p><h1 className="mt-2 max-w-3xl text-4xl font-black">{t("企业全球连接与批量采购")}</h1><p className="mt-4 max-w-2xl text-white/70">{t("为差旅团队、航司、旅行社和跨境企业提供统一报价、合同、批量发放与企业订单管理。")}</p></section><div className="mt-7 grid gap-7 lg:grid-cols-[1fr_480px]"><section className="surface rounded-xl p-6"><h2 className="text-xl font-bold">{t("企业能力")}</h2><ul className="mt-5 grid gap-4 sm:grid-cols-2">{capabilities.map((item) => <li key={item} className="flex gap-2"><CheckCircle size={20} weight="fill" className="text-[var(--forest)]" />{t(item)}</li>)}</ul></section><form onSubmit={submit} className="surface rounded-xl p-6"><h2 className="text-xl font-bold">{t("提交采购询价")}</h2>{submitted && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{t("已受理，询价编号：")}<b>{submitted}</b></p>}<div className="mt-4 grid gap-3"><input name="company" required maxLength={160} placeholder={t("企业名称")} className="rounded-lg border border-[var(--line)] bg-transparent p-3"/><input name="email" required type="email" maxLength={254} placeholder={t("工作邮箱")} className="rounded-lg border border-[var(--line)] bg-transparent p-3"/><input name="quantity" required type="number" min="10" max="100000" placeholder={t("预计采购数量")} className="rounded-lg border border-[var(--line)] bg-transparent p-3"/><textarea name="requirements" required maxLength={1000} placeholder={t("目的地、周期和交付要求")} className="min-h-28 rounded-lg border border-[var(--line)] bg-transparent p-3"/><button className="rounded-lg bg-[var(--forest)] py-3 font-bold text-white">{t("提交询价")}</button></div></form></div></main></PageShell>;
}
