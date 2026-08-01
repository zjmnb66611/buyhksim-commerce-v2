"use client";

import { toast } from "sonner";
import { buildCsv, triggerDownload } from "@/lib/admin-utils";

export function AdminAction({ label, message, className = "" }: { label: string; message: string; className?: string }) {
  const downloadReport = () => {
    const csv = buildCsv(["指标", "数值", "状态"], [["今日成交额", "28640", "正常"], ["支付订单", "328", "正常"], ["待发货", "42", "需处理"], ["新增用户", "186", "正常"]]);
    triggerDownload(["\uFEFF", csv], "text/csv;charset=utf-8", `buyhksim-daily-report-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(message);
  };
  return <button type="button" onClick={downloadReport} className={className}>{label}</button>;
}
