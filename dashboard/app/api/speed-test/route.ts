import { NextResponse } from "next/server"
import { runSpeedQueries } from "@/lib/queries"

export async function GET() {
  const t0 = Date.now()
  try {
    const queries = await runSpeedQueries()
    const totalMs = Date.now() - t0
    return NextResponse.json({ queries, totalMs })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
