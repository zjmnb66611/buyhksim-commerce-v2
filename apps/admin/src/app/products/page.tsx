"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  DownloadSimple,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  UploadSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { AdminModal } from "@/components/admin-modal";
import { triggerDownload } from "@/lib/admin-utils";
import { adminApi } from "@/lib/api-client";

type Row = {
  id: string;
  slug: string;
  title: string;
  description: string;
  destination: string;
  kind: "ESIM" | "PHYSICAL_SIM";
  status: string;
  sku_id: string;
  sku_code: string;
  sku_title: string;
  price_minor: number;
  compare_at_price_minor: number | null;
  commission_bps: number;
  stock: number;
  image_url: string | null;
  sku_attributes: {
    validityDays?: number;
    days?: number;
    dataGb?: number;
    data?: string;
  };
};
type Draft = {
  slug: string;
  title: string;
  description: string;
  destination: string;
  kind: Row["kind"];
  imageUrl?: string;
  sku: {
    code: string;
    title: string;
    priceMinor: number;
    compareAtPriceMinor: null;
    attributes: { validityDays: number; dataGb: number };
    commissionBps: number;
    stock: number;
  };
};
const statusLabel: Record<string, string> = {
  ACTIVE: "已上架",
  INACTIVE: "已下架",
  DRAFT: "草稿",
  PENDING_REVIEW: "待审核",
  SCHEDULED: "定时发布",
  REJECTED: "已驳回",
};
const newKey = () => crypto.randomUUID().replaceAll("-", "");
export default function ProductsPage() {
  const [rows, setRows] = useState<Row[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [modal, setModal] = useState<"single" | "batch" | null>(null),
    [editing, setEditing] = useState<Row | null>(null);
  const deferred = useDeferredValue(query);
  const reload = async () => {
    const payload = await adminApi<{ ok: true; data: Row[] }>(
      "/admin/products",
    );
    setRows(payload.data);
  };
  useEffect(() => {
    void reload()
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "商品加载失败"),
      )
      .finally(() => setLoading(false));
  }, []);
  const visible = useMemo(
    () =>
      rows.filter((row) =>
        `${row.title}${row.sku_code}${row.destination}`
          .toLowerCase()
          .includes(deferred.trim().toLowerCase()),
      ),
    [rows, deferred],
  );
  const save = async (draft: Draft, id?: string) => {
    await adminApi(id ? `/admin/products/${id}` : "/admin/products", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(draft),
    });
    await reload();
    setEditing(null);
    setModal(null);
    toast.success(id ? "商品更新已保存" : "商品草稿已保存");
  };
  const bulkStatus = async (status: "ACTIVE" | "INACTIVE") => {
    if (!selected.length) return toast.error("请先选择商品");
    if (
      !window.confirm(
        `确认批量${status === "ACTIVE" ? "上架" : "下架"} ${selected.length} 个商品？`,
      )
    )
      return;
    await Promise.all(
      selected.map((id) =>
        adminApi(`/admin/products/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
      ),
    );
    await reload();
    setSelected([]);
    toast.success("批量状态更新完成");
  };
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--forest)]">
            CATALOG MANAGEMENT
          </p>
          <h1 className="mt-1 text-3xl font-black">商品管理</h1>
          <p className="mt-2 quiet">所有变更写入服务端数据库并记录操作审计。</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModal("batch")}
            className="secondary-action flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold"
          >
            <UploadSimple />
            批量导入
          </button>
          <button
            onClick={() => setModal("single")}
            className="primary-action flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold"
          >
            <Plus />
            新建商品
          </button>
        </div>
      </div>
      <section className="surface mt-6 overflow-hidden rounded-xl">
        <div className="flex flex-wrap justify-between gap-3 border-b border-[var(--line)] p-4">
          <div className="flex gap-2">
            <button
              onClick={() => void bulkStatus("ACTIVE")}
              className="secondary-action rounded-lg px-3 py-2 text-sm"
            >
              批量上架
            </button>
            <button
              onClick={() => void bulkStatus("INACTIVE")}
              className="secondary-action rounded-lg px-3 py-2 text-sm"
            >
              批量下架
            </button>
          </div>
          <label className="flex min-w-[220px] items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2">
            <MagnifyingGlass />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索商品或 SKU"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="p-4">
                  <input
                    type="checkbox"
                    aria-label="全选"
                    checked={
                      !!visible.length && selected.length === visible.length
                    }
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? visible.map((row) => row.id)
                          : [],
                      )
                    }
                  />
                </th>
                {[
                  "商品 / SKU",
                  "类型",
                  "目的地",
                  "售价",
                  "可用库存",
                  "状态",
                  "操作",
                ].map((item) => (
                  <th className="p-4 font-medium" key={item}>
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t border-[var(--line)]">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() =>
                        setSelected((all) =>
                          all.includes(row.id)
                            ? all.filter((id) => id !== row.id)
                            : [...all, row.id],
                        )
                      }
                    />
                  </td>
                  <td className="p-4">
                    <b>{row.title}</b>
                    <p className="quiet text-xs">{row.sku_code}</p>
                  </td>
                  <td className="p-4">
                    {row.kind === "ESIM" ? "eSIM" : "实体 SIM"}
                  </td>
                  <td className="p-4">{row.destination}</td>
                  <td className="p-4 font-semibold">
                    ¥{(row.price_minor / 100).toFixed(2)}
                  </td>
                  <td className="p-4">{row.stock}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-[var(--wash)] px-2.5 py-1 text-xs font-semibold">
                      {statusLabel[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setEditing(row)}
                      className="inline-flex items-center gap-1 font-semibold text-[var(--forest)]"
                    >
                      <PencilSimple />
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="p-10 text-center quiet">正在加载商品…</p>}
          {!loading && !visible.length && (
            <p className="p-10 text-center quiet">没有符合条件的商品</p>
          )}
        </div>
      </section>
      {(modal === "single" || editing) && (
        <ProductModal
          initial={editing}
          onClose={() => {
            setModal(null);
            setEditing(null);
          }}
          onSave={save}
        />
      )}{" "}
      {modal === "batch" && (
        <BatchModal
          onClose={() => setModal(null)}
          onDone={async () => {
            await reload();
            setModal(null);
          }}
        />
      )}
    </>
  );
}

function ProductModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Row | null;
  onClose: () => void;
  onSave: (draft: Draft, id?: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const imageUrl = String(data.get("imageUrl") ?? "").trim();
    const draft: Draft = {
      slug: String(data.get("slug")),
      title: String(data.get("title")),
      description: String(data.get("description")),
      destination: String(data.get("destination")),
      kind: String(data.get("kind")) as Draft["kind"],
      ...(imageUrl ? { imageUrl } : {}),
      sku: {
        code: String(data.get("sku")),
        title: String(data.get("skuTitle")),
        priceMinor: Math.round(Number(data.get("price")) * 100),
        compareAtPriceMinor: null,
        attributes: {
          validityDays: Number(data.get("validityDays")),
          dataGb: Number(data.get("dataGb")),
        },
        commissionBps: Number(data.get("commissionBps")),
        stock: Number(data.get("stock")),
      },
    };
    setSaving(true);
    try {
      await onSave(draft, initial?.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };
  return (
    <AdminModal title={initial ? "编辑商品" : "新建单个商品"} onClose={onClose}>
      <form
        onSubmit={(event) => void submit(event)}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field name="title" label="商品名称" value={initial?.title} />
        <Field name="slug" label="商品网址标识" value={initial?.slug} />
        <Field name="sku" label="SKU 编码" value={initial?.sku_code} />
        <Field name="skuTitle" label="SKU 名称" value={initial?.sku_title} />
        <Field name="destination" label="目的地" value={initial?.destination} />
        <Field
          name="imageUrl"
          label="商品主图 HTTPS 地址"
          value={initial?.image_url ?? undefined}
          required={false}
        />
        <label className="text-sm">
          卡类型
          <select
            name="kind"
            defaultValue={initial?.kind ?? "ESIM"}
            className="field-surface mt-2 w-full rounded-lg border border-[var(--line)] p-3"
          >
            <option value="ESIM">eSIM</option>
            <option value="PHYSICAL_SIM">实体 SIM</option>
          </select>
        </label>
        <Field
          name="price"
          label="售价（元）"
          type="number"
          value={initial ? String(initial.price_minor / 100) : undefined}
        />
        <Field
          name="stock"
          label="可用库存"
          type="number"
          value={initial ? String(initial.stock) : undefined}
        />
        <Field
          name="validityDays"
          label="有效天数"
          type="number"
          value={String(
            initial?.sku_attributes?.validityDays ??
              initial?.sku_attributes?.days ??
              1,
          )}
        />
        <Field
          name="dataGb"
          label="流量（GB）"
          type="number"
          value={String(initial?.sku_attributes?.dataGb ?? 1)}
        />
        <Field
          name="commissionBps"
          label="佣金基点"
          type="number"
          value={String(initial?.commission_bps ?? 0)}
        />
        <label className="text-sm sm:col-span-2">
          商品说明
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={1000}
            defaultValue={initial?.description}
            className="field-surface mt-2 min-h-24 w-full rounded-lg border border-[var(--line)] p-3"
          />
        </label>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <button
            type="button"
            onClick={onClose}
            className="secondary-action rounded-lg px-5 py-2.5"
          >
            取消
          </button>
          <button
            disabled={saving}
            className="primary-action rounded-lg px-5 py-2.5 font-semibold disabled:opacity-50"
          >
            {saving ? "正在保存…" : "保存"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
function Field({
  name,
  label,
  type = "text",
  value,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string | undefined;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={name === "price" ? "0.01" : "1"}
        maxLength={type === "text" ? 180 : undefined}
        defaultValue={value}
        className="field-surface mt-2 w-full rounded-lg border border-[var(--line)] p-3"
      />
    </label>
  );
}

function BatchModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{
      jobId: string;
      validRows: number;
      errorRows: number;
      errors: Array<{ row: number; field: string; message: string }>;
    } | null>(null);
  const template =
    "externalId,title,description,skuCode,destination,kind,imageUrl,dataGb,validityDays,priceMinor,stock,commissionBps\nHK-5D,香港 5G eSIM,香港本地高速套餐,HK-5G-5D-5G,香港,ESIM,https://cdn.example.com/hk-esim.webp,5,5,5800,100,800\n";
  const validate = async () => {
    if (!file) return toast.error("请先选择 CSV 或 Excel 文件");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const payload = await adminApi<{ ok: true; data: typeof result }>(
        "/admin/imports/products/validate",
        { method: "POST", headers: { "Idempotency-Key": newKey() }, body },
      );
      setResult(payload.data);
      toast.success("服务端校验完成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "校验失败");
    } finally {
      setBusy(false);
    }
  };
  const commit = async () => {
    if (!result?.jobId) return;
    setBusy(true);
    try {
      await adminApi("/admin/imports/products/commit", {
        method: "POST",
        headers: { "Idempotency-Key": newKey() },
        body: JSON.stringify({ jobId: result.jobId }),
      });
      toast.success("有效商品已导入为草稿");
      await onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入失败");
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminModal title="CSV / Excel 批量导入" onClose={onClose}>
      <button
        onClick={() => {
          triggerDownload(
            ["\uFEFF", template],
            "text/csv;charset=utf-8",
            "buyhksim-product-import-template.csv",
          );
        }}
        className="secondary-action flex items-center gap-2 rounded-lg px-4 py-2"
      >
        <DownloadSimple />
        下载模板
      </button>
      <button
        onClick={() => input.current?.click()}
        className="mt-4 w-full rounded-xl border-2 border-dashed border-[var(--line)] p-10"
      >
        <b>{file?.name ?? "选择 CSV 或 Excel 文件"}</b>
        <p className="mt-2 text-sm quiet">
          最大 20MB，最多 10,000 行；文件仅发送给受保护的导入接口。
        </p>
      </button>
      <input
        ref={input}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          setResult(null);
        }}
      />
      {result && (
        <div className="mt-4 rounded-lg bg-[var(--wash)] p-4 text-sm">
          <b>
            {result.validRows} 行有效，{result.errorRows} 行错误
          </b>
          {result.errors.length > 0 && (
            <p className="mt-2 text-amber-700">
              {result.errors
                .slice(0, 5)
                .map(
                  (item) => `第 ${item.row} 行 ${item.field}: ${item.message}`,
                )
                .join("；")}
            </p>
          )}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="secondary-action rounded-lg px-5 py-2.5"
        >
          取消
        </button>
        <button
          disabled={busy || !file}
          onClick={() => void validate()}
          className="secondary-action rounded-lg px-5 py-2.5 disabled:opacity-50"
        >
          服务端校验
        </button>
        <button
          disabled={busy || !result?.validRows}
          onClick={() => void commit()}
          className="primary-action rounded-lg px-5 py-2.5 disabled:opacity-50"
        >
          提交有效数据
        </button>
      </div>
    </AdminModal>
  );
}
