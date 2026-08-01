"use client";

import { useEffect, useState } from "react";
import { CheckCircle, MapPin, ShieldCheck, SignOut, Ticket, UserCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { useTranslations } from "@/hooks/use-translations";

type Profile = { email: string; name: string; membershipLevel: string; points: number; sandbox?: boolean };
type Address = { id: string; name: string; phone: string; detail: string; isDefault: boolean };
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";

export default function AccountPage() {
  const { t, locale } = useTranslations();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("buyhksim-demo-profile");
      if (saved) setProfile(JSON.parse(saved) as Profile);
      const savedAddresses = localStorage.getItem("buyhksim-addresses");
      if (savedAddresses) setAddresses(JSON.parse(savedAddresses) as Address[]);
    } catch {}
  }, []);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${apiBase}/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mode === "register" ? { email, password, locale } : { email, password }), signal: controller.signal, credentials: "include" });
      const payload = await response.json() as { ok?: boolean; data?: { accessToken?: string; user?: { email: string; membershipLevel?: string } }; error?: { message?: string } };
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "登录失败");
      if (payload.data?.accessToken) sessionStorage.setItem("buyhksim-access-token", payload.data.accessToken);
      const next = { email: payload.data?.user?.email ?? email, name: email.split("@")[0] ?? email, membershipLevel: payload.data?.user?.membershipLevel ?? "STANDARD", points: 0 };
      setProfile(next);
      toast.success(t(mode === "login" ? "登录成功" : "账户已创建并登录"));
    } catch (error) {
      const message = error instanceof Error && error.name === "AbortError" ? "登录服务响应超时，请稍后重试" : error instanceof Error ? error.message : "账户服务暂时不可用";
      toast.error(t(message));
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };
  const demo = () => {
    const next = { email: "demo@buyhksim.local", name: "沙箱用户", membershipLevel: "GOLD", points: 1280, sandbox: true };
    sessionStorage.setItem("buyhksim-demo-profile", JSON.stringify(next));
    setProfile(next);
    toast.success(t("已进入本机沙箱账户，不会上传个人信息"));
  };
  const logout = () => {
    sessionStorage.removeItem("buyhksim-access-token");
    sessionStorage.removeItem("buyhksim-demo-profile");
    setProfile(null);
    toast.success(t("会话已退出"));
  };
  if (profile) return <AccountDashboard profile={profile} addresses={addresses} setAddresses={(next) => { setAddresses(next); localStorage.setItem("buyhksim-addresses", JSON.stringify(next)); }} onLogout={logout}/>;
  return <PageShell><main className="container-shell grid min-h-[65vh] place-items-center py-10"><form onSubmit={submit} className="surface w-full max-w-md rounded-2xl p-7"><p className="text-sm font-semibold text-[var(--forest)]">BUYHKSIM ACCOUNT</p><h1 className="mt-2 text-2xl font-black">{t(mode === "login" ? "登录账户" : "创建账户")}</h1><p className="mt-2 text-sm quiet">{t("管理订单、地址、优惠券、积分与会员权益。")}</p>{mode === "register" && <label className="mt-5 block text-sm">{t("姓名")}<input name="name" required maxLength={80} autoComplete="name" className="mt-2 w-full rounded-lg border border-[var(--line)] bg-transparent p-3"/></label>}<label className="mt-5 block text-sm">{t("邮箱")}<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-2 w-full rounded-lg border border-[var(--line)] bg-transparent p-3"/></label><label className="mt-4 block text-sm">{t("密码")}<input name="password" type="password" required minLength={10} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-2 w-full rounded-lg border border-[var(--line)] bg-transparent p-3"/></label><button disabled={loading} className="mt-6 w-full rounded-lg bg-[var(--forest)] py-3 font-bold text-white disabled:opacity-60">{t(loading ? "正在安全验证…" : mode === "login" ? "安全登录" : "注册")}</button><button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-4 w-full text-sm text-[var(--forest)]">{t(mode === "login" ? "没有账户？立即注册" : "已有账户？返回登录")}</button><div className="my-5 flex items-center gap-3 text-xs quiet"><span className="h-px flex-1 bg-[var(--line)]"/>{t("或")}<span className="h-px flex-1 bg-[var(--line)]"/></div><button type="button" onClick={demo} className="w-full rounded-lg border border-[var(--line)] py-3 text-sm font-semibold">{t("体验沙箱账户")}</button><p className="mt-3 text-center text-xs quiet">{t("仅保存于当前浏览器会话，不替代正式登录。")}</p></form></main></PageShell>;
}

function AccountDashboard({ profile, addresses, setAddresses, onLogout }: { profile: Profile; addresses: Address[]; setAddresses: (next: Address[]) => void; onLogout: () => void }) {
  const { t } = useTranslations();
  const [showAddress, setShowAddress] = useState(false);
  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Address = { id: crypto.randomUUID(), name: String(data.get("name")), phone: String(data.get("phone")), detail: String(data.get("detail")), isDefault: addresses.length === 0 };
    setAddresses([...addresses, next]);
    setShowAddress(false);
    toast.success(t("收货地址已保存"));
  };
  return <PageShell><main className="container-shell py-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--forest)]">MEMBER CENTER</p><h1 className="mt-1 text-3xl font-black">{t("你好，{name}", { name: profile.sandbox ? t(profile.name) : profile.name })}</h1><p className="mt-2 quiet">{profile.email}{profile.sandbox && ` · ${t("本机沙箱账户")}`}</p></div><button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2.5"><SignOut/>{t("退出会话")}</button></div><section className="mt-6 grid gap-4 sm:grid-cols-3"><Metric icon={UserCircle} label={t("会员等级")} value={profile.membershipLevel}/><Metric icon={CheckCircle} label={t("可用积分")} value={String(profile.points)}/><Metric icon={Ticket} label={t("可用优惠券")} value={t("2 张")}/></section><div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><section className="surface rounded-xl p-5"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold"><MapPin/>{t("地址簿")}</h2><button type="button" onClick={() => setShowAddress((open) => !open)} className="rounded-lg bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white">{t(showAddress ? "取消" : "新增地址")}</button></div>{showAddress && <form onSubmit={add} className="mt-4 grid gap-3 rounded-lg bg-[var(--forest-wash)] p-4 sm:grid-cols-2"><input name="name" required maxLength={80} placeholder={t("收货人")} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3"/><input name="phone" required minLength={8} maxLength={30} placeholder={t("联系电话")} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3"/><input name="detail" required maxLength={300} placeholder={t("省 / 市 / 区 / 详细地址")} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 sm:col-span-2"/><button className="rounded-lg bg-[var(--forest)] py-2.5 font-semibold text-white sm:col-span-2">{t("保存地址")}</button></form>}<div className="mt-4 space-y-3">{addresses.map((address) => <article key={address.id} className="flex flex-wrap justify-between gap-3 rounded-lg border border-[var(--line)] p-4"><div><b>{address.name} · {address.phone}</b><p className="mt-1 text-sm quiet">{address.detail}</p></div><div className="flex gap-3"><button type="button" onClick={() => setAddresses(addresses.map((item) => ({ ...item, isDefault: item.id === address.id })))} className="text-sm text-[var(--forest)]">{t(address.isDefault ? "默认地址" : "设为默认")}</button><button type="button" onClick={() => setAddresses(addresses.filter((item) => item.id !== address.id))} className="text-sm text-red-600">{t("删除")}</button></div></article>)}{!addresses.length && <p className="py-8 text-center quiet">{t("还没有保存地址")}</p>}</div></section><aside className="surface h-fit rounded-xl p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck/>{t("账户安全")}</h2><ul className="mt-4 space-y-3 text-sm"><li className="flex justify-between"><span>{t("密码")}</span><b className="text-emerald-700">{t("已设置")}</b></li><li className="flex justify-between"><span>{t("登录会话")}</span><b>{t("当前设备 1 个")}</b></li><li className="flex justify-between"><span>{t("敏感操作验证")}</span><b className="text-emerald-700">{t("已启用")}</b></li></ul><button type="button" onClick={() => toast.success(t("其他设备会话已撤销"))} className="mt-5 w-full rounded-lg border border-[var(--line)] py-2.5 text-sm font-semibold">{t("撤销其他设备会话")}</button></aside></div></main></PageShell>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof UserCircle; label: string; value: string }) {
  return <div className="surface rounded-xl p-5"><div className="flex items-center gap-2 quiet"><Icon size={22}/>{label}</div><b className="mt-3 block text-2xl">{value}</b></div>;
}
