import { NextResponse } from "next/server"
import { getExecutionStats } from "@/lib/queries"

export async function GET() {
  try {
    const stats = await getExecutionStats()
    return NextResponse.json(stats)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
