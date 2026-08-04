"use client";
import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTranslations } from "@/hooks/use-translations";

export type FinderValue = { destination: string; days: string; data: string; kind: string };
export function SmartFinder({ onRecommend }: { onRecommend: (value: FinderValue) => void }) {
  const { t } = useTranslations();
  const [value, setValue] = useState<FinderValue>({ destination: "香港", days: "1-7天", data: "5GB以内", kind: "ESIM" });
  const [advanced,setAdvanced]=useState(false);
  const [network,setNetwork]=useState("5G 优先");
  const [device,setDevice]=useState("iPhone / 支持 eSIM");
  const update = (key: keyof FinderValue) => (event: React.ChangeEvent<HTMLSelectElement>) => setValue((current) => ({ ...current, [key]: event.target.value }));
  return <section id="finder" className="surface mt-4 rounded-xl p-5">
    <div className="mb-3 flex items-center justify-between gap-3"><div><b>{t("智能选卡")}</b><span className="ml-2 text-sm quiet">{t("快速找到合适套餐")}</span></div><button type="button" aria-expanded={advanced} onClick={() => setAdvanced((open)=>!open)} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--forest)]">{t("高级筛选")} {advanced?<CaretUp/>:<CaretDown/>}</button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
      <Field label={t("目的地")} value={value.destination} onChange={update("destination")} options={["香港","日本","泰国","新加坡","欧洲 33 国"]} labels={["香港","日本","泰国","新加坡","欧洲 33 国"].map((item) => t(item))} />
      <Field label={t("出行天数")} value={value.days} onChange={update("days")} options={["1-7天","8-15天","16-30天","30天以上"]} labels={["1-7天","8-15天","16-30天","30天以上"].map((item) => t(item))} />
      <Field label={t("流量容量")} value={value.data} onChange={update("data")} options={["5GB以内","5-15GB","15-30GB","不限量"]} labels={["5GB以内","5-15GB","15-30GB","不限量"].map((item) => t(item))} />
      <Field label={t("卡类型")} value={value.kind} onChange={update("kind")} options={["ESIM","PHYSICAL_SIM"]} labels={["eSIM",t("实体卡 (SIM)")]} />
      <button onClick={() => { onRecommend(value); toast.success(t("已为你筛选推荐套餐")); }} className="self-end rounded-lg bg-[var(--forest)] px-7 py-3 font-semibold text-white transition hover:bg-[var(--forest-strong)]">{t("查看推荐套餐")}</button>
    </div>
    {advanced&&<div className="mt-4 grid gap-4 border-t border-[var(--line)] pt-4 md:grid-cols-2"><Field label={t("网络偏好")} value={network} onChange={(event)=>setNetwork(event.target.value)} options={["5G 优先","4G 稳定优先","不限速优先"]} labels={["5G 优先","4G 稳定优先","不限速优先"].map((item) => t(item))}/><Field label={t("设备兼容")} value={device} onChange={(event)=>setDevice(event.target.value)} options={["iPhone / 支持 eSIM","Android / 支持 eSIM","仅支持实体 SIM","随身 Wi-Fi"]} labels={["iPhone / 支持 eSIM","Android / 支持 eSIM","仅支持实体 SIM","随身 Wi-Fi"].map((item) => t(item))}/><p className="text-xs quiet md:col-span-2">{t("推荐时会同时考虑 {network} 与 {device}，下单前仍需在商品详情确认设备型号。", { network: t(network), device: t(device) })}</p></div>}
  </section>;
}
function Field({ label, value, onChange, options, labels = options }: { label: string; value: string; onChange: React.ChangeEventHandler<HTMLSelectElement>; options: string[]; labels?: string[] }) { return <label className="text-sm"><span className="mb-2 block font-medium">{label}</span><select value={value} onChange={onChange} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 outline-none focus:border-[var(--forest)]">{options.map((option, index) => <option key={option} value={option}>{labels[index]}</option>)}</select></label>; }
