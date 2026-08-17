"use client"

interface Props { data: { country: string; city: string; activeUsers: number; events: number }[] | undefined; isLoading: boolean; queryMs?: number }

export function GeoTable({ data, isLoading, queryMs }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Geographic Breakdown (5 min)</h2>
        {queryMs != null && <span className="text-[10px] text-green-400 font-medium">{queryMs}ms</span>}
      </div>
      {isLoading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-[var(--muted)] rounded animate-pulse" />)}</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[var(--muted-foreground)] border-b border-[var(--border)]"><th className="text-left py-2 font-medium">Location</th><th className="text-right py-2 font-medium">Users</th><th className="text-right py-2 font-medium">Events</th></tr></thead>
            <tbody>{data?.map((row) => (<tr key={`${row.country}-${row.city}`} className="border-b border-[var(--border)]/50"><td className="py-2"><span className="font-medium">{row.country}</span> <span className="text-[var(--muted-foreground)]">{row.city}</span></td><td className="py-2 text-right font-medium">{row.activeUsers}</td><td className="py-2 text-right text-[var(--muted-foreground)]">{row.events.toLocaleString()}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
