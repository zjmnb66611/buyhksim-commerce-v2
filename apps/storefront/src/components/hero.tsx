import Image from "next/image";
import { CheckCircle, Headset, Package, SimCard } from "@phosphor-icons/react/dist/ssr";

export function Hero() {
  return <section className="surface relative min-h-[258px] overflow-hidden rounded-xl">
    <Image src="/images/hero-rome.webp" alt="罗马城市与台伯河风景" fill priority sizes="(max-width: 1024px) 100vw, 1100px" className="object-cover object-center" />
    <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)] via-[color:var(--surface)]/88 to-transparent" />
    <div className="relative z-10 max-w-[760px] px-8 py-9 md:px-10">
      <p className="mb-2 text-sm font-semibold text-[var(--forest)]">TRUSTED GLOBAL CONNECTIVITY</p>
      <h1 className="text-3xl font-black tracking-tight md:text-[40px]">即买即用，全球高速上网</h1>
      <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-sm quiet"><span className="flex items-center gap-1.5"><CheckCircle weight="fill" className="text-[var(--forest)]" />覆盖 200+ 国家和地区</span><span className="flex items-center gap-1.5"><CheckCircle weight="fill" className="text-[var(--forest)]" />优质网络，稳定高速</span><span className="flex items-center gap-1.5"><CheckCircle weight="fill" className="text-[var(--forest)]" />中文客服 7×24 在线</span></div>
      <div className="mt-8 grid max-w-[620px] grid-cols-3 gap-5 text-sm">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)]"><SimCard size={20} /></span><span><b className="block">即时交付</b><small className="quiet">eSIM 立即发送</small></span></div>
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)]"><Package size={20} /></span><span><b className="block">顺丰发货</b><small className="quiet">实体卡快速送达</small></span></div>
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)]"><Headset size={20} /></span><span><b className="block">安心售后</b><small className="quiet">不满意可退</small></span></div>
      </div>
    </div>
    <div className="absolute bottom-5 right-5 z-10 hidden rounded-xl bg-[#073f37]/95 px-5 py-4 text-white shadow-xl md:block"><p><strong className="text-3xl">98</strong><span className="ml-1">% 用户满意度</span></p><p className="mt-1 text-xs text-amber-300">★★★★★</p><p className="mt-1 text-xs text-white/75">来自 52,318 条真实评价</p></div>
  </section>;
}
