export default function Loading() {
  return <div role="status" aria-live="polite" className="space-y-6">
    <span className="sr-only">正在加载管理页面</span>
    <div className="h-4 w-36 animate-pulse rounded bg-[var(--wash)]" />
    <div className="h-10 w-56 animate-pulse rounded-lg bg-[var(--wash)]" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="surface h-36 animate-pulse rounded-xl bg-[var(--surface-muted)]" />)}</div>
    <div className="surface h-72 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
  </div>;
}
