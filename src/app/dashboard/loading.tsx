export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-zinc-200/80" />
        <div className="h-8 w-48 rounded-lg bg-zinc-200/80" />
        <div className="h-4 w-40 rounded bg-zinc-100" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-64 rounded-2xl border border-zinc-200/80 bg-white/70" />
        <div className="h-64 rounded-2xl border border-zinc-200/80 bg-white/70" />
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}
