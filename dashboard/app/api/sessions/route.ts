import { NextResponse } from "next/server"
import { getSessionAnalytics } from "@/lib/queries"

export async function GET() {
  const t0 = Date.now()
  try {
    const sessions = await getSessionAnalytics()
    const queryMs = Date.now() - t0
    return NextResponse.json({ ...sessions, queryMs })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
