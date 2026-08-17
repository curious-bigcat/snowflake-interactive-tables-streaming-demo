import { NextRequest, NextResponse } from "next/server"
import { runBurstQueries } from "@/lib/queries"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const concurrency = Math.min(Math.max(Number(body.concurrency) || 100, 10), 500)
    const result = await runBurstQueries(concurrency)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
