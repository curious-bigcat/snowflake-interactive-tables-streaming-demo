"use client"

interface Props {
  data: {
    AVG_EXEC_MS?: number
    MIN_EXEC_MS?: number
    MAX_EXEC_MS?: number
    AVG_COMPILE_MS?: number
    AVG_TOTAL_MS?: number
    QUERY_COUNT?: number
    UNDER_10MS?: number
    UNDER_50MS?: number
    UNDER_100MS?: number
  } | undefined
}

export function PerformanceBar({ data }: Props) {
  if (!data || !data.QUERY_COUNT) return null

  const total = data.QUERY_COUNT
  const under10 = data.UNDER_10MS ?? 0
  const under50 = data.UNDER_50MS ?? 0
  const under100 = data.UNDER_100MS ?? 0

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Query Execution Performance (last {total} queries from QUERY_HISTORY)</h2>
        <div className="flex items-center gap-4 text-xs">
          <span>Avg: <strong className="text-green-400">{data.AVG_EXEC_MS}ms</strong></span>
          <span>Min: <strong className="text-green-400">{data.MIN_EXEC_MS}ms</strong></span>
          <span>Max: <strong>{data.MAX_EXEC_MS}ms</strong></span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-green-400 font-medium">Sub-10ms</span>
            <span className="font-bold text-green-400">{under10}/{total}</span>
          </div>
          <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all duration-500" style={{ width: `${(under10 / total) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-emerald-400 font-medium">Sub-50ms</span>
            <span className="font-bold text-emerald-400">{under50}/{total}</span>
          </div>
          <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(under50 / total) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-blue-400 font-medium">Sub-100ms</span>
            <span className="font-bold text-blue-400">{under100}/{total}</span>
          </div>
          <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${(under100 / total) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
