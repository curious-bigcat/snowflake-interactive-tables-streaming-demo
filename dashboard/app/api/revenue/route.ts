import { NextResponse } from "next/server"
import { getRevenueTimeline, getDeviceBreakdown, getGeographicBreakdown } from "@/lib/queries"

export async function GET() {
  const t0 = Date.now()
  try {
    const [timeline, devices, geo] = await Promise.all([
      getRevenueTimeline(),
      getDeviceBreakdown(),
      getGeographicBreakdown(),
    ])
    const queryMs = Date.now() - t0
    return NextResponse.json({ timeline, devices, geo, queryMs })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
