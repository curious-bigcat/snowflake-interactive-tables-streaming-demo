"use client"

interface FunnelStage { stage: string; users: number; events: number }
interface Props { data: FunnelStage[] | undefined; isLoading: boolean; queryMs?: number }

export function ConversionFunnel({ data, isLoading, queryMs }: Props) {
  const maxUsers = data ? Math.max(...data.map((d) => d.users), 1) : 1
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Conversion Funnel (5 min)</h2>
        {queryMs != null && <span className="text-[10px] text-green-400 font-medium">{queryMs}ms</span>}
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-[var(--muted)] rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {data?.map((stage, i) => {
            const width = (stage.users / maxUsers) * 100
            const colors = ["bg-blue-500", "bg-blue-400", "bg-yellow-500", "bg-orange-500", "bg-green-500"]
            return (
              <div key={stage.stage}>
                <div className="flex justify-between text-xs mb-1"><span>{stage.stage}</span><span className="text-[var(--muted-foreground)]">{stage.users.toLocaleString()} users</span></div>
                <div className="h-7 bg-[var(--muted)] rounded-md overflow-hidden"><div className={`h-full ${colors[i]} rounded-md transition-all duration-500`} style={{ width: `${width}%` }} /></div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
