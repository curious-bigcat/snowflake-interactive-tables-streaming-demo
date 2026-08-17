import { NextResponse } from "next/server"
import { getConversionFunnel } from "@/lib/queries"

export async function GET() {
  const t0 = Date.now()
  try {
    const funnel = await getConversionFunnel()
    const queryMs = Date.now() - t0
    return NextResponse.json({ funnel, queryMs })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
