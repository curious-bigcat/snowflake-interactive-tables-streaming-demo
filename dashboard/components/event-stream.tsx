"use client"

interface Props { data: { eventType: string; userId: string; productName: string; city: string; country: string; timestamp: string }[] | undefined; isLoading: boolean; queryMs?: number }
const EVENT_COLORS: Record<string, string> = { page_view: "text-gray-400", product_view: "text-blue-400", add_to_cart: "text-yellow-400", checkout: "text-orange-400", purchase: "text-green-400" }

export function EventStream({ data, isLoading, queryMs }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Live Event Stream</h2>
        {queryMs != null && <span className="text-[10px] text-green-400 font-medium">{queryMs}ms</span>}
      </div>
      {isLoading ? <div className="space-y-1.5">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-5 bg-[var(--muted)] rounded animate-pulse" />)}</div> : (
        <div className="space-y-1 max-h-[280px] overflow-y-auto font-mono text-xs">
          {data?.map((event, i) => {
            const color = EVENT_COLORS[event.eventType] || "text-gray-400"
            const time = new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            return (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className="text-[var(--muted-foreground)] w-16 shrink-0">{time}</span>
                <span className={`w-24 shrink-0 ${color}`}>{event.eventType}</span>
                <span className="text-[var(--muted-foreground)] w-16 shrink-0">{event.userId}</span>
                <span className="truncate">{event.productName || event.city}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
