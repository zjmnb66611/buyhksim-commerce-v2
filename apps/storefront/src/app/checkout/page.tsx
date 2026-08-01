"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, CreditCard, LockKey, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { formatMoney, products } from "@/data/products";
import { useCommerceStore } from "@/store/commerce-store";
import { useTranslations } from "@/hooks/use-translations";

const channels = [{ id: "WECHAT", label: "微信支付" }, { id: "ALIPAY", label: "支付宝" }, { id: "UNIONPAY", label: "银联支付" }] as const;

export default function CheckoutPage() {
  const { t, intlLocale, locale } = useTranslations();
  const { cart, clearCart } = useCommerceStore();
  const [channel, setChannel] = useState("WECHAT");
  const [done, setDone] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const items = useMemo(() => cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ ...line, product }] : [];
  }), [cart]);
  const subtotal = items.reduce((sum, item) => sum + item.product.priceMinor * item.quantity, 0);
  const promotionDiscount = subtotal >= 20000 ? 2000 : 0;
  const couponDiscount = couponApplied ? Math.min(2000, Math.max(0, subtotal - promotionDiscount)) : 0;
  const discount = promotionDiscount + couponDiscount;
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() !== "WELCOME20") {
      setCouponApplied(false);
      return toast.error(t("优惠券无效或不适用于当前商品"));
    }
    setCouponApplied(true);
    toast.success(t("WELCOME20 已生效，优惠 ¥20"));
  };

  const pay = async () => {
    if (!items.length) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error(t("请填写有效邮箱"));
    if (phone.replace(/\D/g, "").length < 8) return toast.error(t("请填写有效联系电话"));
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const no = `BH${new Date().toISOString().slice(0, 10).replaceAll("-", "")}${Math.floor(100000 + Math.random() * 900000)}`;
    const order = {
      no,
      title: items.map((item) => `${item.product.title} × ${item.quantity}`).join("、"),
      amount: formatMoney(total, intlLocale),
      status: "待激活",
      kind: items.every((item) => item.product.kind === "ESIM") ? "eSIM" : "混合订单",
      time: new Date().toLocaleString(intlLocale),
      locale,
    };
    try {
      const current = JSON.parse(localStorage.getItem("buyhksim-orders") ?? "[]") as unknown[];
      localStorage.setItem("buyhksim-orders", JSON.stringify([order, ...current]));
    } catch {}
    setOrderNo(no);
    setProcessing(false);
    setDone(true);
    clearCart();
    toast.success(t("沙箱支付成功，未产生真实扣款"));
  };

  if (done) return <PageShell><main className="container-shell grid min-h-[65vh] place-items-center py-10"><div className="surface max-w-lg rounded-2xl p-10 text-center"><CheckCircle size={64} weight="fill" className="mx-auto text-[var(--forest)]" /><h1 className="mt-4 text-2xl font-black">{t("沙箱订单已创建")}</h1><p className="mt-2 font-mono text-sm">{orderNo}</p><p className="mt-3 quiet">{t("本次流程用于验证库存、订单与支付契约，没有产生真实扣款。正式渠道凭证到位后可切换适配器。")}</p><Link href="/orders" className="mt-6 inline-block rounded-lg bg-[var(--forest)] px-6 py-3 font-bold text-white">{t("查看订单")}</Link></div></main></PageShell>;

  const selectedChannel = channels.find((item) => item.id === channel)?.label ?? "微信支付";
  return <PageShell><main className="container-shell py-8"><div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-semibold text-[var(--forest)]">SECURE CHECKOUT</p><h1 className="text-3xl font-black">{t("安全结算")}</h1></div><span className="flex items-center gap-2 text-sm quiet"><LockKey size={20} />{t("服务端权威计价")}</span></div>
    <div className="grid gap-7 lg:grid-cols-[1fr_420px]"><div className="space-y-5"><section className="surface rounded-xl p-5"><h2 className="font-bold">1. {t("联系信息")}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm">{t("电子邮箱")}<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("用于接收 eSIM 与订单通知")} className="mt-2 w-full rounded-lg border border-[var(--line)] bg-transparent p-3" /></label><label className="text-sm">{t("联系电话")}<input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+86" className="mt-2 w-full rounded-lg border border-[var(--line)] bg-transparent p-3" /></label></div></section>
      <section className="surface rounded-xl p-5"><h2 className="font-bold">2. {t("优惠与积分")}</h2><div className="mt-4 flex gap-3"><input value={coupon} onChange={(event) => { setCoupon(event.target.value); setCouponApplied(false); }} placeholder={t("输入优惠券码（试用 WELCOME20）")} className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-transparent p-3" /><button type="button" onClick={applyCoupon} className="rounded-lg border border-[var(--forest)] px-5 font-semibold text-[var(--forest)]">{t(couponApplied ? "已使用" : "使用")}</button></div></section>
      <section className="surface rounded-xl p-5"><h2 className="font-bold">3. {t("选择支付方式")} <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">{t("沙箱")}</span></h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{channels.map((item) => <button key={item.id} onClick={() => setChannel(item.id)} className={`flex items-center justify-center gap-2 rounded-lg border p-4 ${channel === item.id ? "border-[var(--forest)] bg-[var(--forest-wash)] font-bold text-[var(--forest)]" : "border-[var(--line)]"}`}><CreditCard size={20} />{t(item.label)}</button>)}</div></section></div>
      <aside className="surface h-fit rounded-xl p-5 lg:sticky lg:top-28"><h2 className="text-lg font-bold">{t("订单摘要")}</h2><div className="mt-4 space-y-4">{items.map((item) => <div key={item.productId} className="flex justify-between gap-4 text-sm"><span>{t(item.product.title)} × {item.quantity}<small className="mt-1 block quiet">{item.days} {t("天")} · {t(item.data)}</small></span><b>{formatMoney(item.product.priceMinor * item.quantity, intlLocale)}</b></div>)}</div>{!items.length && <p className="py-8 text-center quiet">{t("购物车为空")}</p>}<div className="mt-5 space-y-2 border-t border-[var(--line)] pt-4 text-sm"><p className="flex justify-between"><span>{t("商品小计")}</span><span>{formatMoney(subtotal, intlLocale)}</span></p><p className="flex justify-between text-[var(--forest)]"><span>{t("满减优惠")}</span><span>-{formatMoney(discount, intlLocale)}</span></p><p className="flex justify-between pt-2 text-lg font-black"><span>{t("应付")}</span><span className="price">{formatMoney(total, intlLocale)}</span></p></div><button disabled={!items.length || processing} onClick={pay} className="mt-5 w-full rounded-lg bg-[var(--forest)] py-3.5 font-bold text-white disabled:opacity-50">{processing ? t("正在创建沙箱支付…") : t("使用{channel}支付", { channel: t(selectedChannel) })}</button><p className="mt-4 flex gap-2 text-xs quiet"><ShieldCheck size={18} className="shrink-0" />{t("支付回调将验签并核对商户号、订单号、金额与币种；重复回调可安全重入。")}</p></aside></div>
  </main></PageShell>;
}
