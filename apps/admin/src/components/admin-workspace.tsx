"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CheckCircle, DownloadSimple, MagnifyingGlass, PencilSimple, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { AdminModal } from "@/components/admin-modal";
import { buildCsv, triggerDownload } from "@/lib/admin-utils";

type RecordRow = { id: string; name: string; reference: string; status: string; owner: string; updatedAt: string };
const statuses = ["待处理", "处理中", "已完成", "已暂停"];

function createSeed(cards: string[]): RecordRow[] {
  return cards.flatMap((card, index) => [
    { id: `${index + 1}-1`, name: `${card} · 示例任务 A`, reference: `BH-${String(index + 1).padStart(2, "0")}-260801`, status: index % 2 ? "处理中" : "待处理", owner: index % 2 ? "财务组" : "运营组", updatedAt: "今天 10:20" },
    { id: `${index + 1}-2`, name: `${card} · 示例任务 B`, reference: `BH-${String(index + 1).padStart(2, "0")}-260731`, status: "已完成", owner: "管理员", updatedAt: "昨天 18:06" },
  ]);
}

function isRecordRows(value: unknown): value is RecordRow[] {
  return Array.isArray(value) && value.length <= 2_000 && value.every((row) => {
    if (!row || typeof row !== "object") return false;
    const item = row as Record<string, unknown>;
    return ["id", "name", "reference", "status", "owner", "updatedAt"].every((key) => typeof item[key] === "string" && String(item[key]).length <= 180);
  });
}

export function AdminWorkspace({ section, cards }: { section: string; cards: string[] }) {
  const storageKey = `buyhksim-admin-${section}`;
  const [active, setActive] = useState(cards[0] ?? "");
  const [rows, setRows] = useState<RecordRow[]>(() => createSeed(cards));
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState("全部状态");
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isRecordRows(parsed)) setRows(parsed);
        else localStorage.removeItem(storageKey);
      }
    } catch { localStorage.removeItem(storageKey); }
    setHydrated(true);
  }, [storageKey]);
  useEffect(() => { if (hydrated) localStorage.setItem(storageKey, JSON.stringify(rows)); }, [hydrated, rows, storageKey]);

  const activeIndex = Math.max(0, cards.indexOf(active));
  const prefix = `${activeIndex + 1}-`;
  const visible = useMemo(() => rows.filter((row) => row.id.startsWith(prefix) && (status === "全部状态" || row.status === status) && `${row.name}${row.reference}${row.owner}`.toLowerCase().includes(deferredQuery.trim().toLowerCase())), [deferredQuery, prefix, rows, status]);

  const closeEditor = () => { setEditing(null); setCreating(false); };
  const save = (row: RecordRow) => {
    setRows((all) => all.some((item) => item.id === row.id) ? all.map((item) => item.id === row.id ? row : item) : [row, ...all]);
    closeEditor();
    toast.success("已保存并写入本机运营草稿");
  };
  const exportCsv = () => {
    const csv = buildCsv(["任务名称", "业务编号", "状态", "负责人", "更新时间"], visible.map((row) => [row.name, row.reference, row.status, row.owner, row.updatedAt]));
    triggerDownload(["\uFEFF", csv], "text/csv;charset=utf-8", `${section}-${Date.now()}.csv`);
    toast.success("当前列表已导出");
  };

  return <>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card, index) => <button key={card} type="button" onClick={() => { setActive(card); setQuery(""); setStatus("全部状态"); }} aria-pressed={active === card} className={`surface rounded-xl p-5 text-left transition-[transform,box-shadow,border-color] ${active === card ? "border-[var(--forest)] ring-2 ring-[var(--focus)]" : "hover:-translate-y-0.5 hover:shadow-md"}`}><span className="text-sm font-black text-[var(--forest)]">0{index + 1}</span><h2 className="mt-3 text-lg font-bold">{card}</h2><p className="mt-2 text-sm quiet">查看、筛选、新建和更新任务记录。</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--forest)]">{active === card ? <><CheckCircle weight="fill" />正在管理</> : "进入管理 →"}</span></button>)}</div>

    <section className="surface mt-6 overflow-hidden rounded-xl" aria-live="polite">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-4"><div><p className="text-xs font-semibold text-[var(--forest)]">当前工作区</p><h2 className="text-xl font-black">{active}</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={exportCsv} className="secondary-action inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"><DownloadSimple />导出列表</button><button type="button" onClick={() => setCreating(true)} className="primary-action inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"><Plus />新建记录</button></div></header>
      <div className="flex flex-wrap gap-3 border-b border-[var(--line)] bg-[var(--surface-muted)] p-4"><label className="field-surface flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2"><MagnifyingGlass /><span className="sr-only">搜索记录</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、编号或负责人" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><select aria-label="按状态筛选" value={status} onChange={(event) => setStatus(event.target.value)} className="field-surface rounded-lg border border-[var(--line)] px-3 py-2 text-sm"><option>全部状态</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="table-head"><tr>{["任务名称", "业务编号", "状态", "负责人", "更新时间", "操作"].map((heading) => <th key={heading} scope="col" className="p-4 font-medium">{heading}</th>)}</tr></thead><tbody>{visible.map((row) => <tr key={row.id} className="border-t border-[var(--line)]"><td className="p-4 font-semibold">{row.name}</td><td className="p-4 font-mono text-xs">{row.reference}</td><td className="p-4"><StatusBadge status={row.status} /></td><td className="p-4">{row.owner}</td><td className="p-4 quiet">{row.updatedAt}</td><td className="p-4"><button type="button" onClick={() => setEditing(row)} className="inline-flex items-center gap-1 font-semibold text-[var(--forest)]"><PencilSimple />编辑</button></td></tr>)}</tbody></table>{!visible.length && <p className="p-10 text-center quiet">没有符合条件的记录</p>}</div>
    </section>
    {(editing || creating) && <Editor row={editing ?? { id: `${activeIndex + 1}-${crypto.randomUUID()}`, name: `${active} · 新任务`, reference: `BH-${String(activeIndex + 1).padStart(2, "0")}-${Date.now().toString().slice(-6)}`, status: "待处理", owner: "运营组", updatedAt: "刚刚" }} onClose={closeEditor} onSave={save} />}
  </>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "已完成" ? "bg-emerald-100 text-emerald-800" : status === "待处理" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-800";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function Editor({ row, onClose, onSave }: { row: RecordRow; onClose: () => void; onSave: (row: RecordRow) => void }) {
  const [draft, setDraft] = useState(row);
  return <AdminModal title="编辑运营记录" onClose={onClose} maxWidth="max-w-xl"><form onSubmit={(event) => { event.preventDefault(); onSave({ ...draft, updatedAt: "刚刚" }); }} className="grid gap-4 sm:grid-cols-2"><label className="text-sm sm:col-span-2">任务名称<input autoFocus required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="field-surface mt-2 w-full rounded-lg border border-[var(--line)] p-3" /></label><label className="text-sm">业务编号<input required maxLength={60} value={draft.reference} onChange={(event) => setDraft({ ...draft, reference: event.target.value })} className="field-surface mt-2 w-full rounded-lg border border-[var(--line)] p-3" /></label><label className="text-sm">状态<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="field-surface mt-2 w-full rounded-lg border border-[var(--line)] p-3">{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm sm:col-span-2">负责人<input required maxLength={40} value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} className="field-surface mt-2 w-full rounded-lg border border-[var(--line)] p-3" /></label><div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={onClose} className="secondary-action rounded-lg px-5 py-2.5">取消</button><button className="primary-action rounded-lg px-5 py-2.5 font-semibold">保存更新</button></div></form></AdminModal>;
}
