"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  CreditCard,
  LockKey,
  MapPin,
  ShieldCheck,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { formatMoney } from "@/data/products";
import { apiRequest } from "@/lib/api-client";
import { useCommerceStore } from "@/store/commerce-store";
import { useTranslations } from "@/hooks/use-translations";

const channels = [
  { id: "WECHAT", label: "微信支付" },
  { id: "ALIPAY", label: "支付宝" },
  { id: "UNIONPAY", label: "银联支付" },
] as const;
type Address = {
  id: string;
  name: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
};
type Preview = {
  lines: Array<{ skuId: string; quantity: number }>;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  totalMinor: number;
  pointsUsed: number;
  previewToken: string;
  expiresAt: string;
};

export default function CheckoutPage() {
  const { t, intlLocale } = useTranslations();
  const { cart, clearCart } = useCommerceStore();
  const [channel, setChannel] =
    useState<(typeof channels)[number]["id"]>("WECHAT");
  const [processing, setProcessing] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [points, setPoints] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<{
    orderNo: string;
    sandbox: boolean;
  } | null>(null);
  const items = useMemo(() => cart, [cart]);
  const containsPhysical = items.some((item) => item.kind === "PHYSICAL_SIM");
  useEffect(() => {
    void apiRequest<{ ok: true; data: Address[] }>("/addresses")
      .then((payload) => {
        setAddresses(payload.data);
        setAddressId(
          payload.data.find((address) => address.isDefault)?.id ??
            payload.data[0]?.id ??
            "",
        );
      })
      .catch(() => undefined);
  }, []);
  const requestPreview = async () => {
    const payload = await apiRequest<{ ok: true; data: Preview }>(
      "/checkout/preview",
      {
        method: "POST",
        body: JSON.stringify({
          lines: items.map((item) => ({
            skuId: item.skuId,
            quantity: item.quantity,
          })),
          couponCode: coupon.trim() || undefined,
          pointsToUse: points,
          addressId: addressId || undefined,
        }),
      },
    );
    setPreview(payload.data);
    return payload.data;
  };
  const refreshPreview = async () => {
    if (!items.length) return;
    try {
      setProcessing(true);
      await requestPreview();
      toast.success(t("订单金额已由服务端重新计算"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("结算失败，请稍后重试"),
      );
    } finally {
      setProcessing(false);
    }
  };
  const pay = async () => {
    if (!items.length) return;
    if (containsPhysical && !addressId)
      return toast.error(t("实体 SIM 订单必须选择收货地址"));
    try {
      setProcessing(true);
      const priced = await requestPreview();
      const order = await apiRequest<{
        ok: true;
        data: { orderId: string; orderNo: string };
      }>("/checkout/orders", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          lines: priced.lines,
          couponCode: coupon.trim() || undefined,
          pointsToUse: points,
          addressId: addressId || undefined,
          previewToken: priced.previewToken,
        }),
      });
      const payment = await apiRequest<{
        ok: true;
        data: { redirectUrl: string; sandbox?: boolean };
      }>("/payments", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ orderId: order.data.orderId, channel }),
      });
      clearCart();
      setResult({
        orderNo: order.data.orderNo,
        sandbox: Boolean(payment.data.sandbox),
      });
      if (!payment.data.sandbox && payment.data.redirectUrl)
        window.location.assign(payment.data.redirectUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("支付创建失败，请安全重试"),
      );
    } finally {
      setProcessing(false);
    }
  };
  if (result)
    return (
      <PageShell>
        <main className="container-shell grid min-h-[65vh] place-items-center py-10">
          <div className="surface max-w-lg rounded-2xl p-10 text-center">
            <CheckCircle
              size={64}
              weight="fill"
              className="mx-auto text-[var(--forest)]"
            />
            <h1 className="mt-4 text-2xl font-black">
              {t(result.sandbox ? "沙箱支付单已创建" : "订单已创建")}
            </h1>
            <p className="mt-2 font-mono text-sm">{result.orderNo}</p>
            <p className="mt-3 quiet">
              {t(
                result.sandbox
                  ? "沙箱环境不会产生真实扣款，订单保持待支付状态。"
                  : "请在支付渠道完成付款，订单状态以服务端回调为准。",
              )}
            </p>
            <Link
              href="/orders"
              className="mt-6 inline-block rounded-lg bg-[var(--forest)] px-6 py-3 font-bold text-white"
            >
              {t("查看订单")}
            </Link>
          </div>
        </main>
      </PageShell>
    );
  const estimated = items.reduce(
    (sum, item) => sum + item.priceMinor * item.quantity,
    0,
  );
  const subtotal = preview?.subtotalMinor ?? estimated;
  const discount = preview?.discountMinor ?? 0;
  const shipping = preview?.shippingMinor ?? 0;
  const total = preview?.totalMinor ?? estimated;
  return (
    <PageShell>
      <main className="container-shell py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--forest)]">
              SECURE CHECKOUT
            </p>
            <h1 className="text-3xl font-black">{t("安全结算")}</h1>
          </div>
          <span className="flex items-center gap-2 text-sm quiet">
            <LockKey size={20} />
            {t("服务端权威计价")}
          </span>
        </div>
        <div className="grid gap-7 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            {containsPhysical && (
              <section className="surface rounded-xl p-5">
                <h2 className="flex items-center gap-2 font-bold">
                  <MapPin />
                  1. {t("收货地址")}
                </h2>
                {addresses.length ? (
                  <select
                    value={addressId}
                    onChange={(event) => {
                      setAddressId(event.target.value);
                      setPreview(null);
                    }}
                    className="mt-4 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3"
                  >
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.name} · {address.phone} · {address.province}
                        {address.city}
                        {address.district}
                        {address.detail}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-4 text-sm quiet">
                    <Link
                      href="/account"
                      className="font-semibold text-[var(--forest)]"
                    >
                      {t("请先在账户中心添加收货地址")}
                    </Link>
                  </p>
                )}
              </section>
            )}
            <section className="surface rounded-xl p-5">
              <h2 className="font-bold">
                {containsPhysical ? "2." : "1."} {t("优惠与积分")}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
                <input
                  value={coupon}
                  onChange={(event) => {
                    setCoupon(event.target.value);
                    setPreview(null);
                  }}
                  placeholder={t("输入优惠券码")}
                  className="min-w-0 rounded-lg border border-[var(--line)] bg-transparent p-3"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={points}
                  onChange={(event) => {
                    setPoints(Math.max(0, Number(event.target.value) || 0));
                    setPreview(null);
                  }}
                  aria-label={t("使用积分")}
                  className="rounded-lg border border-[var(--line)] bg-transparent p-3"
                />
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => void refreshPreview()}
                  className="rounded-lg border border-[var(--forest)] px-5 font-semibold text-[var(--forest)] disabled:opacity-50"
                >
                  {t("重新计价")}
                </button>
              </div>
            </section>
            <section className="surface rounded-xl p-5">
              <h2 className="font-bold">
                {containsPhysical ? "3." : "2."} {t("选择支付方式")}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {channels.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setChannel(item.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-4 ${channel === item.id ? "border-[var(--forest)] bg-[var(--forest-wash)] font-bold text-[var(--forest)]" : "border-[var(--line)]"}`}
                  >
                    <CreditCard size={20} />
                    {t(item.label)}
                  </button>
                ))}
              </div>
            </section>
          </div>
          <aside className="surface h-fit rounded-xl p-5 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold">{t("订单摘要")}</h2>
            <div className="mt-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.skuId}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span>
                    {t(item.title)} × {item.quantity}
                    <small className="mt-1 block quiet">
                      {item.days} {t("天")} · {t(item.data)}
                    </small>
                  </span>
                  <b>
                    {formatMoney(item.priceMinor * item.quantity, intlLocale)}
                  </b>
                </div>
              ))}
            </div>
            {!items.length && (
              <p className="py-8 text-center quiet">{t("购物车为空")}</p>
            )}
            <div className="mt-5 space-y-2 border-t border-[var(--line)] pt-4 text-sm">
              <p className="flex justify-between">
                <span>{t("商品小计")}</span>
                <span>{formatMoney(subtotal, intlLocale)}</span>
              </p>
              <p className="flex justify-between">
                <span>{t("运费")}</span>
                <span>{formatMoney(shipping, intlLocale)}</span>
              </p>
              <p className="flex justify-between text-[var(--forest)]">
                <span>{t("优惠合计")}</span>
                <span>-{formatMoney(discount, intlLocale)}</span>
              </p>
              <p className="flex justify-between pt-2 text-lg font-black">
                <span>{t("应付")}</span>
                <span className="price">{formatMoney(total, intlLocale)}</span>
              </p>
            </div>
            <button
              disabled={
                !items.length || processing || (containsPhysical && !addressId)
              }
              onClick={() => void pay()}
              className="mt-5 w-full rounded-lg bg-[var(--forest)] py-3.5 font-bold text-white disabled:opacity-50"
            >
              {processing ? t("正在创建支付…") : t("确认订单并支付")}
            </button>
            <p className="mt-4 flex gap-2 text-xs quiet">
              <ShieldCheck size={18} className="shrink-0" />
              {t(
                "付款结果以支付渠道服务端回调为准，关闭页面不会影响订单处理。",
              )}
            </p>
          </aside>
        </div>
      </main>
    </PageShell>
  );
}
