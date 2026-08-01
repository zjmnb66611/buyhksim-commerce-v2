"use client";

import { WarningCircle } from "@phosphor-icons/react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="surface mx-auto max-w-xl rounded-2xl p-8 text-center"><WarningCircle size={48} className="mx-auto text-amber-600" /><h1 className="mt-4 text-2xl font-black">页面暂时无法加载</h1><p className="mt-2 quiet">系统已保留当前浏览器中的草稿数据，请重试本次操作。</p><button type="button" onClick={reset} className="primary-action mt-6 rounded-lg px-5 py-2.5 font-semibold">重新加载</button></section>;
}
