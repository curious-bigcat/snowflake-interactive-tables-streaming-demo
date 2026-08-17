"use client"

import { useQuery } from "@tanstack/react-query"

interface Props {
  refreshInterval: number
}

export function LatencyKpis({ refreshInterval }: Props) {
  const kpis = useQuery({
    queryKey: ["latency-kpis"],
    queryFn: () => fetch("/api/latency-kpis").then((r) => r.json()),
    refetchInterval: refreshInterval,
  })

  const data = kpis.data

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* Sub-10ms: Simple count with tight time filter */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-bl-full" />
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-green-400">Sub-10ms</span>
          {data?.eventCount?.execMs != null && (
            <span className="text-xs font-bold text-green-400">{data.eventCount.execMs}ms</span>
          )}
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-2">Events (last 10s)</p>
        {data?.eventCount ? (
          <p className="text-3xl font-bold">{Number(data.eventCount.value).toLocaleString()}</p>
        ) : (
          <div className="h-9 w-20 bg-[var(--muted)] rounded animate-pulse" />
        )}
        <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-mono">{"SELECT COUNT(*) WHERE timestamp >= -10s"}</p>
      </div>

      {/* Sub-50ms: Revenue aggregate */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-bl-full" />
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-400">Sub-50ms</span>
          {data?.revenue?.execMs != null && (
            <span className="text-xs font-bold text-emerald-400">{data.revenue.execMs}ms</span>
          )}
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-2">Revenue (last 1 min)</p>
        {data?.revenue ? (
          <p className="text-3xl font-bold">${Number(data.revenue.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        ) : (
          <div className="h-9 w-28 bg-[var(--muted)] rounded animate-pulse" />
        )}
        <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-mono">SELECT SUM(price*qty) WHERE type=purchase</p>
      </div>

      {/* Sub-100ms: Conversion funnel count */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-bl-full" />
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-blue-400">Sub-100ms</span>
          {data?.funnel?.execMs != null && (
            <span className="text-xs font-bold text-blue-400">{data.funnel.execMs}ms</span>
          )}
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-2">Purchases (last 5 min)</p>
        {data?.funnel ? (
          <>
            <p className="text-3xl font-bold">{Number(data.funnel.purchases).toLocaleString()}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">from {Number(data.funnel.pageViews).toLocaleString()} page views ({data.funnel.rate}% conv)</p>
          </>
        ) : (
          <div className="h-9 w-20 bg-[var(--muted)] rounded animate-pulse" />
        )}
        <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-mono">SELECT COUNT(*) GROUP BY event_type</p>
      </div>
    </div>
  )
}
