import { NextResponse } from "next/server"
import { getCategoryPerformance } from "@/lib/queries"

export async function GET() {
  const t0 = Date.now()
  try {
    const categories = await getCategoryPerformance()
    const queryMs = Date.now() - t0
    return NextResponse.json({ categories, queryMs })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
