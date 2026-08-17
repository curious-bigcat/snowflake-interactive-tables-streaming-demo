"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface Props { data: { category: string; views: number; cartAdds: number; purchases: number; revenue: number }[] | undefined; isLoading: boolean; queryMs?: number }

export function CategoryPerformance({ data, isLoading, queryMs }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Category Performance (5 min)</h2>
        {queryMs != null && <span className="text-[10px] text-green-400 font-medium">{queryMs}ms</span>}
      </div>
      {isLoading ? <div className="h-48 bg-[var(--muted)] rounded animate-pulse" /> : data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} width={75} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <div className="h-48 flex items-center justify-center text-sm text-[var(--muted-foreground)]">No data yet</div>}
    </div>
  )
}
