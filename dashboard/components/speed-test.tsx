"use client"

import { useState } from "react"

interface SpeedResult {
  label: string
  roundTripMs: number
  executionMs: number | null
  compilationMs: number | null
  totalElapsedMs: number | null
}

function latencyColor(ms: number): string {
  if (ms <= 10) return "text-green-400"
  if (ms <= 50) return "text-emerald-400"
  if (ms <= 100) return "text-blue-400"
  if (ms <= 500) return "text-yellow-400"
  return "text-red-400"
}

function latencyBg(ms: number): string {
  if (ms <= 10) return "bg-green-400"
  if (ms <= 50) return "bg-emerald-400"
  if (ms <= 100) return "bg-blue-400"
  if (ms <= 500) return "bg-yellow-400"
  return "bg-red-400"
}

export function SpeedTest() {
  const [results, setResults] = useState<SpeedResult[] | null>(null)
  const [running, setRunning] = useState(false)
  const [totalMs, setTotalMs] = useState<number | null>(null)

  async function run() {
    setRunning(true)
    try {
      const res = await fetch("/api/speed-test")
      const data = await res.json()
      setResults(data.queries)
      setTotalMs(data.totalMs)
    } finally {
      setRunning(false)
    }
  }

  const execTimes = results?.map((r) => r.executionMs).filter((v): v is number => v != null) || []
  const buckets = execTimes.length > 0
    ? {
        sub10: execTimes.filter((ms) => ms <= 10).length,
        sub50: execTimes.filter((ms) => ms <= 50).length,
        sub100: execTimes.filter((ms) => ms <= 100).length,
        total: execTimes.length,
      }
    : null

  const maxExec = execTimes.length > 0 ? Math.max(...execTimes, 1) : 1

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Query Speed Test</h2>
        <button
          onClick={run}
          disabled={running}
          className="px-3 py-1 text-xs font-medium rounded-md bg-[var(--accent)] text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {running ? "Running..." : "Run Speed Test"}
        </button>
      </div>

      {buckets && (
        <div className="flex items-center gap-3 mb-4 text-xs flex-wrap">
          <span className="text-green-400 font-medium">{buckets.sub10}/{buckets.total} under 10ms</span>
          <span className="text-emerald-400 font-medium">{buckets.sub50}/{buckets.total} under 50ms</span>
          <span className="text-blue-400 font-medium">{buckets.sub100}/{buckets.total} under 100ms</span>
          {totalMs != null && <span className="text-[var(--muted-foreground)] ml-auto">Total round-trip: {totalMs}ms</span>}
        </div>
      )}

      {results && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
            <span className="w-44 shrink-0">Query</span>
            <span className="flex-1">Execution Time (Snowflake)</span>
            <span className="w-16 text-right">Exec</span>
            <span className="w-16 text-right">Round-trip</span>
          </div>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-[var(--muted-foreground)] w-44 shrink-0 truncate">{r.label}</span>
              <div className="flex-1 h-5 bg-[var(--muted)] rounded overflow-hidden relative">
                {r.executionMs != null && (
                  <div
                    className={`h-full ${latencyBg(r.executionMs)} rounded transition-all duration-300 opacity-80`}
                    style={{ width: `${Math.max((r.executionMs / maxExec) * 100, 3)}%` }}
                  />
                )}
              </div>
              <span className={`text-xs font-mono font-bold w-16 text-right ${r.executionMs != null ? latencyColor(r.executionMs) : "text-gray-500"}`}>
                {r.executionMs != null ? `${r.executionMs}ms` : "—"}
              </span>
              <span className="text-xs font-mono w-16 text-right text-[var(--muted-foreground)]">
                {r.roundTripMs}ms
              </span>
            </div>
          ))}
        </div>
      )}

      {!results && !running && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Runs 8 queries and shows actual Snowflake execution time (from QUERY_HISTORY) vs full network round-trip.
          Execution time is the real server-side work; round-trip includes network + SDK overhead.
        </p>
      )}
    </div>
  )
}
