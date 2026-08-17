"use client"

interface MetricCardsProps {
  data: { ACTIVE_USERS?: number; EVENTS_PER_SEC?: number; REVENUE_5MIN?: number; CONVERSION_RATE?: number } | undefined
  isLoading: boolean
  queryMs?: number
}

export function MetricCards({ data, isLoading, queryMs }: MetricCardsProps) {
  const cards = [
    { label: "Active Users", value: data?.ACTIVE_USERS ?? 0, format: (v: number) => v.toLocaleString(), subtitle: "Last 60 seconds" },
    { label: "Events/sec", value: data?.EVENTS_PER_SEC ?? 0, format: (v: number) => v.toFixed(1), subtitle: "Last 30 seconds" },
    { label: "Revenue", value: data?.REVENUE_5MIN ?? 0, format: (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, subtitle: "Last 5 minutes" },
    { label: "Conversion Rate", value: data?.CONVERSION_RATE ?? 0, format: (v: number) => `${v.toFixed(2)}%`, subtitle: "Last 5 minutes" },
  ]

  return (
    <div>
      <div className="flex items-center justify-end mb-1 text-[10px]">
        {queryMs != null && <span className="text-green-400 font-medium">{queryMs}ms</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">{card.label}</p>
            {isLoading ? <div className="h-8 w-24 mt-2 bg-[var(--muted)] rounded animate-pulse" /> : <p className="text-2xl font-bold mt-1">{card.format(card.value)}</p>}
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{card.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
