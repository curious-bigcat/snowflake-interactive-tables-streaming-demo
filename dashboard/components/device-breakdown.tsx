"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface Props { data: { device: string; events: number; users: number }[] | undefined; isLoading: boolean; queryMs?: number }
const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444"]

export function DeviceBreakdown({ data, isLoading, queryMs }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Device Breakdown (5 min)</h2>
        {queryMs != null && <span className="text-[10px] text-green-400 font-medium">{queryMs}ms</span>}
      </div>
      {isLoading ? <div className="h-48 bg-[var(--muted)] rounded animate-pulse" /> : data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="events" nameKey="device" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }} formatter={(value: number, name: string) => [`${value.toLocaleString()} events`, name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: "#a3a3a3" }}>{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      ) : <div className="h-48 flex items-center justify-center text-sm text-[var(--muted-foreground)]">No data yet</div>}
    </div>
  )
}
