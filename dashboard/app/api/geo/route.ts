import { NextResponse } from "next/server"
import { getGeographicBreakdown } from "@/lib/queries"

export async function GET() {
  const t0 = Date.now()
  try {
    const geo = await getGeographicBreakdown()
    const queryMs = Date.now() - t0
    return NextResponse.json({ geo, queryMs })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
