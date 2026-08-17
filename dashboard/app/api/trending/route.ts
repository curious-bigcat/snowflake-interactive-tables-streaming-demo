import { NextResponse } from "next/server"
import { getTrendingProducts } from "@/lib/queries"

export async function GET() {
  const t0 = Date.now()
  try {
    const products = await getTrendingProducts()
    const queryMs = Date.now() - t0
    return NextResponse.json({ products, queryMs })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
