import { NextResponse } from "next/server"
import { getRecentEvents } from "@/lib/queries"

export async function GET() {
  const t0 = Date.now()
  try {
    const events = await getRecentEvents()
    const queryMs = Date.now() - t0
    return NextResponse.json({ events, queryMs })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
