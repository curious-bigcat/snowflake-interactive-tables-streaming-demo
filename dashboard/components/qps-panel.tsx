"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface BurstResult {
  totalQueries: number
  successful: number
  wallClockMs: number
  qps: number
  rt: { p50: number; p95: number; p99: number; max: number }
  exec: { avgExecMs: number; p50ExecMs: number; p95ExecMs: number; maxExecMs: number }
}

export function QpsPanel() {
  const [concurrency, setConcurrency] = useState(100)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BurstResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runBurst() {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch("/api/qps-burst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concurrency }),
      })
      if (!res.ok) throw new Error(await res.text())
      setResult(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    } finally {
      setRunning(false)
    }
  }

  const histogramData = result
    ? [
        { label: "p50", exec: result.exec.p50ExecMs, rt: result.rt.p50 },
        { label: "p95", exec: result.exec.p95ExecMs, rt: result.rt.p95 },
        { label: "p99", exec: 0, rt: result.rt.p99 },
        { label: "max", exec: result.exec.maxExecMs, rt: result.rt.max },
      ]
    : []

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">QPS Burst Test</h2>
        {result && (
          <span className="text-sm font-bold text-[var(--accent)]">
            {result.qps} QPS
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--muted-foreground)]">Concurrency:</label>
          <input type="range" min="50" max="500" step="50" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} className="w-32" />
          <span className="text-xs font-medium w-8">{concurrency}</span>
        </div>
        <button onClick={runBurst} disabled={running} className="px-4 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)] text-white disabled:opacity-50 hover:opacity-90 transition-opacity">
          {running ? "Running..." : "Run Burst Test"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Throughput</p>
              <p className="text-lg font-bold text-[var(--accent)]">{result.qps} QPS</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Wall Clock</p>
              <p className="text-lg font-bold">{(result.wallClockMs / 1000).toFixed(2)}s</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Avg Exec (Snowflake)</p>
              <p className="text-lg font-bold text-green-400">{result.exec.avgExecMs}ms</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">p95 Exec (Snowflake)</p>
              <p className="text-lg font-bold text-green-400">{result.exec.p95ExecMs}ms</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">p95 Round-trip</p>
              <p className="text-lg font-bold">{result.rt.p95}ms</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Success Rate</p>
              <p className="text-lg font-bold">{((result.successful / result.totalQueries) * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">Latency: Exec (green) vs Round-trip (blue)</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={histogramData}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }} formatter={(value: number, name: string) => [`${value}ms`, name === "exec" ? "Snowflake Exec" : "Round-trip"]} />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(value) => value === "exec" ? "Snowflake Exec" : "Round-trip"} />
                <Bar dataKey="exec" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rt" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
