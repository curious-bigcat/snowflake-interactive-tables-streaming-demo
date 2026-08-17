"use client"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface Props { data: { minute: string; revenue: number; purchases: number }[] | undefined; isLoading: boolean; queryMs?: number }

export function RevenueChart({ data, isLoading, queryMs }: Props) {
  const chartData = data?.map((d) => ({ ...d, time: new Date(d.minute).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }))
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Revenue per Minute (30 min)</h2>
        {queryMs != null && <span className="text-[10px] text-green-400 font-medium">{queryMs}ms</span>}
      </div>
      {isLoading ? <div className="h-48 bg-[var(--muted)] rounded animate-pulse" /> : chartData && chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs><linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revenueGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : <div className="h-48 flex items-center justify-center text-sm text-[var(--muted-foreground)]">No purchase data yet</div>}
    </div>
  )
}
