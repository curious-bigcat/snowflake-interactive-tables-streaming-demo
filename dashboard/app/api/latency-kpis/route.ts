import { NextResponse } from "next/server"
import { querySnowflake } from "@/lib/snowflake"

export async function GET() {
  const WH = "ECOM_IWH"
  const TBL = "ECOM_STREAMING.CLICKSTREAM.CLICK_EVENTS"

  try {
    // Query 1: Sub-10ms target — simple COUNT with tight time filter
    const r1 = await querySnowflake(
      `SELECT COUNT(*) AS C FROM ${TBL} WHERE EVENT_TIMESTAMP >= DATEADD(second, -10, CURRENT_TIMESTAMP())`,
      { warehouse: WH },
    )

    // Query 2: Sub-50ms target — revenue SUM with narrow filter
    const r2 = await querySnowflake(
      `SELECT COALESCE(SUM(PRODUCT_PRICE * QUANTITY), 0) AS R FROM ${TBL} WHERE EVENT_TYPE = 'purchase' AND EVENT_TIMESTAMP >= DATEADD(minute, -1, CURRENT_TIMESTAMP())`,
      { warehouse: WH },
    )

    // Query 3: Sub-100ms target — funnel aggregation
    const r3 = await querySnowflake(
      `SELECT
        COUNT(CASE WHEN EVENT_TYPE = 'page_view' THEN 1 END) AS PV,
        COUNT(CASE WHEN EVENT_TYPE = 'purchase' THEN 1 END) AS P
      FROM ${TBL}
      WHERE EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP())`,
      { warehouse: WH },
    )

    // Get execution times from QUERY_HISTORY
    const history = await querySnowflake(
      `SELECT QUERY_TEXT, EXECUTION_TIME
       FROM TABLE(ECOM_STREAMING.INFORMATION_SCHEMA.QUERY_HISTORY(RESULT_LIMIT => 10))
       WHERE WAREHOUSE_NAME = 'ECOM_IWH' AND QUERY_TYPE = 'SELECT' AND EXECUTION_STATUS = 'SUCCESS'
       ORDER BY START_TIME DESC`,
      { warehouse: WH },
    )

    const findExec = (pattern: string) => {
      const match = history.find((h) => (h.QUERY_TEXT || "").toLowerCase().includes(pattern))
      return match ? Number(match.EXECUTION_TIME) : null
    }

    const pageViews = Number(r3[0]?.PV || 0)
    const purchases = Number(r3[0]?.P || 0)
    const rate = pageViews > 0 ? ((purchases / pageViews) * 100).toFixed(2) : "0"

    return NextResponse.json({
      eventCount: {
        value: r1[0]?.C || 0,
        execMs: findExec("dateadd(second, -10"),
      },
      revenue: {
        value: r2[0]?.R || 0,
        execMs: findExec("sum(product_price"),
      },
      funnel: {
        pageViews,
        purchases,
        rate,
        execMs: findExec("page_view"),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
