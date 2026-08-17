"use client"

interface Props { data: { AVG_PAGES?: number; AVG_DURATION_SEC?: number; BOUNCE_RATE?: number; TOTAL_SESSIONS?: number } | undefined; isLoading: boolean; queryMs?: number }

export function SessionAnalytics({ data, isLoading, queryMs }: Props) {
  const cards = [
    { label: "Avg Pages/Session", value: data?.AVG_PAGES ?? 0, format: (v: number) => v.toFixed(1) },
    { label: "Avg Duration", value: data?.AVG_DURATION_SEC ?? 0, format: (v: number) => `${v.toFixed(0)}s` },
    { label: "Bounce Rate", value: data?.BOUNCE_RATE ?? 0, format: (v: number) => `${v.toFixed(1)}%` },
    { label: "Sessions", value: data?.TOTAL_SESSIONS ?? 0, format: (v: number) => v.toLocaleString() },
  ]
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Session Analytics (5 min)</h2>
        {queryMs != null && <span className="text-[10px] text-green-400 font-medium">{queryMs}ms</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <div key={card.label}>
            <p className="text-xs text-[var(--muted-foreground)]">{card.label}</p>
            {isLoading ? <div className="h-6 w-16 mt-1 bg-[var(--muted)] rounded animate-pulse" /> : <p className="text-lg font-bold mt-0.5">{card.format(card.value)}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
