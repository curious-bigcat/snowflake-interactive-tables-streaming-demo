import { NextResponse } from "next/server"
import { getRealtimeMetrics } from "@/lib/queries"

export async function GET() {
  const t0 = Date.now()
  try {
    const metrics = await getRealtimeMetrics()
    const queryMs = Date.now() - t0
    return NextResponse.json({ ...metrics, queryMs })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
