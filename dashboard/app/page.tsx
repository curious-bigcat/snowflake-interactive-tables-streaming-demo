"use client"

import { useQuery } from "@tanstack/react-query"
import { useRef, useCallback, useState, useEffect } from "react"
import { MetricCards } from "@/components/metric-cards"
import { ConversionFunnel } from "@/components/conversion-funnel"
import { TrendingProducts } from "@/components/trending-products"
import { RevenueChart } from "@/components/revenue-chart"
import { DeviceBreakdown } from "@/components/device-breakdown"
import { GeoTable } from "@/components/geo-table"
import { CategoryPerformance } from "@/components/category-performance"
import { SessionAnalytics } from "@/components/session-analytics"
import { EventStream } from "@/components/event-stream"
import { QpsPanel } from "@/components/qps-panel"
import { SpeedTest } from "@/components/speed-test"
import { PerformanceBar } from "@/components/performance-bar"
import { LatencyKpis } from "@/components/latency-kpis"

function useFetch(url: string, key: string[], interval: number) {
  return useQuery({
    queryKey: key,
    queryFn: () => fetch(url).then((r) => r.json()),
    refetchInterval: interval,
  })
}

export default function DashboardPage() {
  const [refreshInterval, setRefreshInterval] = useState(3000)

  const metrics = useFetch("/api/metrics", ["metrics"], refreshInterval)
  const funnel = useFetch("/api/funnel", ["funnel"], refreshInterval)
  const trending = useFetch("/api/trending", ["trending"], refreshInterval)
  const revenue = useFetch("/api/revenue", ["revenue"], refreshInterval)
  const geo = useFetch("/api/geo", ["geo"], refreshInterval)
  const categories = useFetch("/api/categories", ["categories"], refreshInterval)
  const sessions = useFetch("/api/sessions", ["sessions"], refreshInterval)
  const events = useFetch("/api/events", ["events"], Math.min(refreshInterval, 2000))

  const execStats = useQuery({
    queryKey: ["execStats"],
    queryFn: () => fetch("/api/execution-stats").then((r) => r.json()),
    refetchInterval: 5000,
  })

  // Live QPS tracking
  const queryTimestamps = useRef<number[]>([])
  const [liveQps, setLiveQps] = useState(0)

  const trackQuery = useCallback(() => {
    queryTimestamps.current.push(Date.now())
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      queryTimestamps.current = queryTimestamps.current.filter((t) => now - t < 5000)
      setLiveQps(Math.round((queryTimestamps.current.length / 5) * 10) / 10)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { if (metrics.data) trackQuery() }, [metrics.dataUpdatedAt])
  useEffect(() => { if (funnel.data) trackQuery() }, [funnel.dataUpdatedAt])
  useEffect(() => { if (trending.data) trackQuery() }, [trending.dataUpdatedAt])
  useEffect(() => { if (revenue.data) trackQuery() }, [revenue.dataUpdatedAt])
  useEffect(() => { if (geo.data) trackQuery() }, [geo.dataUpdatedAt])
  useEffect(() => { if (categories.data) trackQuery() }, [categories.dataUpdatedAt])
  useEffect(() => { if (sessions.data) trackQuery() }, [sessions.dataUpdatedAt])
  useEffect(() => { if (events.data) trackQuery() }, [events.dataUpdatedAt])

  const avgExec = execStats.data?.AVG_EXEC_MS
  const avgCompile = execStats.data?.AVG_COMPILE_MS
  const avgTotal = execStats.data?.AVG_TOTAL_MS

  return (
    <div className="min-h-screen p-6">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">E-Commerce Streaming Analytics</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Real-time clickstream via Kafka → Snowpipe Streaming v2 → Interactive Table
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              Live
            </span>
            {avgTotal != null && <span>Snowflake: <strong className="text-green-400">{avgTotal}ms</strong> <span className="text-[9px]">(exec {avgExec} + compile {avgCompile})</span></span>}
            <span>QPS: <strong className="text-[var(--accent)]">{liveQps}/s</strong></span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-[var(--muted)] border border-[var(--border)] rounded px-2 py-0.5 text-xs text-[var(--foreground)]"
            >
              <option value={3000}>Refresh: 3s</option>
              <option value={5000}>Refresh: 5s</option>
              <option value={10000}>Refresh: 10s</option>
            </select>
          </div>
        </div>
      </header>

      <PerformanceBar data={execStats.data} />

      <LatencyKpis refreshInterval={refreshInterval} />

      <MetricCards data={metrics.data} isLoading={metrics.isLoading} queryMs={metrics.data?.queryMs} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ConversionFunnel data={funnel.data?.funnel} isLoading={funnel.isLoading} queryMs={funnel.data?.queryMs} />
        <RevenueChart data={revenue.data?.timeline} isLoading={revenue.isLoading} queryMs={revenue.data?.queryMs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <TrendingProducts data={trending.data?.products} isLoading={trending.isLoading} queryMs={trending.data?.queryMs} />
        <CategoryPerformance data={categories.data?.categories} isLoading={categories.isLoading} queryMs={categories.data?.queryMs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <GeoTable data={geo.data?.geo} isLoading={geo.isLoading} queryMs={geo.data?.queryMs} />
        <SessionAnalytics data={sessions.data} isLoading={sessions.isLoading} queryMs={sessions.data?.queryMs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <EventStream data={events.data?.events} isLoading={events.isLoading} queryMs={events.data?.queryMs} />
        <DeviceBreakdown data={revenue.data?.devices} isLoading={revenue.isLoading} queryMs={revenue.data?.queryMs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <SpeedTest />
        <QpsPanel />
      </div>
    </div>
  )
}
