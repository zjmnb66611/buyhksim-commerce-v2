import Link from "next/link";
import { ArrowUpRight, CheckCircle, Clock, Package, ShoppingBag, TrendUp, UsersThree, Warning } from "@phosphor-icons/react/dist/ssr";
import { AdminAction } from "@/components/admin-action";

const metrics = [["今日成交额", "¥ 28,640", "+18.6%", TrendUp], ["支付订单", "328", "+12.4%", ShoppingBag], ["待发货", "42", "需处理", Package], ["新增用户", "186", "+9.1%", UsersThree]] as const;

export default function Dashboard() {
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--forest)]">OPERATIONS OVERVIEW</p><h1 className="mt-1 text-3xl font-black">经营概览</h1><p className="mt-2 quiet">数据更新时间：刚刚</p></div><AdminAction label="下载日报" message="日报已生成并下载" className="primary-action rounded-lg px-5 py-2.5 font-semibold" /></div>
    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([name, value, trend, Icon]) => <div key={name} className="surface rounded-xl p-5"><div className="flex items-center justify-between"><span className="quiet">{name}</span><Icon size={22} className="text-[var(--forest)]" /></div><strong className="mt-4 block text-3xl">{value}</strong><p className="mt-2 text-sm text-[var(--forest)]">{trend}</p></div>)}</section>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><section className="surface rounded-xl p-5"><div className="flex justify-between"><h2 className="text-lg font-bold">待办事项</h2><Link href="/orders" className="text-sm text-[var(--forest)]">查看全部 <ArrowUpRight className="inline" /></Link></div><div className="mt-4 space-y-3"><Todo icon={Warning} title="8 个商品导入行需要修正" detail="批量任务 #IMP-260731-03" tone="amber" /><Todo icon={Clock} title="12 个退款申请等待审核" detail="其中 3 个将在 4 小时内超时" tone="blue" /><Todo icon={Package} title="42 个实体卡订单待发货" detail="顺丰面单可批量打印" tone="green" /><Todo icon={CheckCircle} title="昨日支付对账已匹配" detail="微信、支付宝、银联沙箱无差异" tone="green" /></div></section><section className="surface rounded-xl p-5"><h2 className="text-lg font-bold">系统健康</h2><div className="mt-4 space-y-4">{[["API 服务", "正常"], ["PostgreSQL", "正常"], ["Redis / 任务队列", "正常"], ["支付回调", "沙箱"], ["对象存储", "本地适配器"]].map(([name, status]) => <div key={name} className="flex justify-between border-b border-[var(--line)] pb-3 text-sm"><span>{name}</span><b className="text-[var(--forest)]">{status}</b></div>)}</div></section></div>
  </>;
}

function Todo({ icon: Icon, title, detail, tone }: { icon: typeof Warning; title: string; detail: string; tone: string }) {
  return <div className="flex gap-3 rounded-lg border border-[var(--line)] p-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-[var(--wash)] text-[var(--forest)]"}`}><Icon size={20} /></span><div><b className="text-sm">{title}</b><p className="mt-1 text-xs quiet">{detail}</p></div></div>;
}
