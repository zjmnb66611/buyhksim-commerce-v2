import Link from "next/link";

export default function NotFound() {
  return <section className="surface mx-auto max-w-xl rounded-2xl p-8 text-center"><p className="text-sm font-semibold text-[var(--forest)]">404</p><h1 className="mt-2 text-2xl font-black">管理页面不存在</h1><p className="mt-2 quiet">该功能可能已调整位置，请返回经营概览继续操作。</p><Link href="/" className="primary-action mt-6 inline-flex rounded-lg px-5 py-2.5 font-semibold">返回经营概览</Link></section>;
}
