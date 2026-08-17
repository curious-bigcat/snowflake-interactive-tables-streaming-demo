import { querySnowflake } from "./snowflake"

const WH = "ECOM_IWH"
const DB_SCHEMA = "ECOM_STREAMING.CLICKSTREAM"

export async function getLastExecTime(): Promise<number | null> {
  try {
    const rows = await querySnowflake(
      `SELECT EXECUTION_TIME FROM TABLE(ECOM_STREAMING.INFORMATION_SCHEMA.QUERY_HISTORY(RESULT_LIMIT => 3))
       WHERE WAREHOUSE_NAME = 'ECOM_IWH' AND QUERY_TYPE = 'SELECT' AND EXECUTION_STATUS = 'SUCCESS'
       ORDER BY START_TIME DESC LIMIT 1`,
      { warehouse: WH },
    )
    return rows[0] ? Number(rows[0].EXECUTION_TIME) : null
  } catch {
    return null
  }
}

export async function getExecutionStats() {
  const rows = await querySnowflake(
    `SELECT
      ROUND(AVG(EXECUTION_TIME)) AS AVG_EXEC_MS,
      MIN(EXECUTION_TIME) AS MIN_EXEC_MS,
      MAX(EXECUTION_TIME) AS MAX_EXEC_MS,
      ROUND(AVG(COMPILATION_TIME)) AS AVG_COMPILE_MS,
      ROUND(AVG(TOTAL_ELAPSED_TIME)) AS AVG_TOTAL_MS,
      COUNT(*) AS QUERY_COUNT,
      COUNT(CASE WHEN EXECUTION_TIME <= 10 THEN 1 END) AS UNDER_10MS,
      COUNT(CASE WHEN EXECUTION_TIME <= 50 THEN 1 END) AS UNDER_50MS,
      COUNT(CASE WHEN EXECUTION_TIME <= 100 THEN 1 END) AS UNDER_100MS
    FROM TABLE(ECOM_STREAMING.INFORMATION_SCHEMA.QUERY_HISTORY(RESULT_LIMIT => 50))
    WHERE WAREHOUSE_NAME = 'ECOM_IWH'
      AND QUERY_TYPE = 'SELECT'
      AND EXECUTION_STATUS = 'SUCCESS'`,
    { warehouse: WH },
  )
  return rows[0] || {}
}

function q(sql: string) {
  return querySnowflake(`USE DATABASE ECOM_STREAMING; ${sql}`, { warehouse: WH })
}

export async function getRealtimeMetrics() {
  const rows = await querySnowflake(
    `SELECT
      COUNT(DISTINCT CASE WHEN EVENT_TIMESTAMP >= DATEADD(second, -60, CURRENT_TIMESTAMP()) THEN USER_ID END) AS ACTIVE_USERS,
      COUNT(CASE WHEN EVENT_TIMESTAMP >= DATEADD(second, -30, CURRENT_TIMESTAMP()) THEN 1 END) / 30.0 AS EVENTS_PER_SEC,
      COALESCE(SUM(CASE WHEN EVENT_TYPE = 'purchase' AND EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP()) THEN PRODUCT_PRICE * QUANTITY END), 0) AS REVENUE_5MIN,
      CASE
        WHEN COUNT(CASE WHEN EVENT_TYPE = 'page_view' AND EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP()) THEN 1 END) = 0 THEN 0
        ELSE COUNT(CASE WHEN EVENT_TYPE = 'purchase' AND EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP()) THEN 1 END) * 100.0
             / COUNT(CASE WHEN EVENT_TYPE = 'page_view' AND EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP()) THEN 1 END)
      END AS CONVERSION_RATE,
      COUNT(*) AS TOTAL_EVENTS
    FROM ${DB_SCHEMA}.CLICK_EVENTS`,
    { warehouse: WH },
  )
  return rows[0] || {}
}

export async function getConversionFunnel() {
  const rows = await querySnowflake(
    `SELECT
      EVENT_TYPE,
      COUNT(*) AS EVENT_COUNT,
      COUNT(DISTINCT USER_ID) AS UNIQUE_USERS
    FROM ${DB_SCHEMA}.CLICK_EVENTS
    WHERE EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP())
      AND EVENT_TYPE IN ('page_view', 'product_view', 'add_to_cart', 'checkout', 'purchase')
    GROUP BY EVENT_TYPE`,
    { warehouse: WH },
  )
  const order = ["page_view", "product_view", "add_to_cart", "checkout", "purchase"]
  const labels = ["Page View", "Product View", "Add to Cart", "Checkout", "Purchase"]
  return order.map((type, i) => {
    const row = rows.find((r) => r.EVENT_TYPE === type)
    return {
      stage: labels[i],
      users: row ? Number(row.UNIQUE_USERS) : 0,
      events: row ? Number(row.EVENT_COUNT) : 0,
    }
  })
}

export async function getTrendingProducts() {
  const rows = await querySnowflake(
    `SELECT
      PRODUCT_NAME,
      PRODUCT_CATEGORY,
      PRODUCT_PRICE,
      COUNT(*) AS VIEW_COUNT,
      COUNT(DISTINCT USER_ID) AS UNIQUE_VIEWERS
    FROM ${DB_SCHEMA}.CLICK_EVENTS
    WHERE EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP())
      AND EVENT_TYPE IN ('product_view', 'add_to_cart', 'purchase')
      AND PRODUCT_NAME != ''
    GROUP BY PRODUCT_NAME, PRODUCT_CATEGORY, PRODUCT_PRICE
    ORDER BY VIEW_COUNT DESC
    LIMIT 10`,
    { warehouse: WH },
  )
  return rows.map((r) => ({
    name: r.PRODUCT_NAME,
    category: r.PRODUCT_CATEGORY,
    price: Number(r.PRODUCT_PRICE),
    views: Number(r.VIEW_COUNT),
    uniqueViewers: Number(r.UNIQUE_VIEWERS),
  }))
}

export async function getRevenueTimeline() {
  const rows = await querySnowflake(
    `SELECT
      TIME_SLICE(EVENT_TIMESTAMP, 1, 'MINUTE') AS MINUTE,
      SUM(PRODUCT_PRICE * QUANTITY) AS REVENUE,
      COUNT(*) AS PURCHASE_COUNT
    FROM ${DB_SCHEMA}.CLICK_EVENTS
    WHERE EVENT_TYPE = 'purchase'
      AND EVENT_TIMESTAMP >= DATEADD(minute, -30, CURRENT_TIMESTAMP())
    GROUP BY MINUTE
    ORDER BY MINUTE`,
    { warehouse: WH },
  )
  return rows.map((r) => ({
    minute: r.MINUTE,
    revenue: Number(r.REVENUE),
    purchases: Number(r.PURCHASE_COUNT),
  }))
}

export async function getDeviceBreakdown() {
  const rows = await querySnowflake(
    `SELECT
      DEVICE_TYPE,
      COUNT(*) AS EVENT_COUNT,
      COUNT(DISTINCT USER_ID) AS UNIQUE_USERS
    FROM ${DB_SCHEMA}.CLICK_EVENTS
    WHERE EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP())
    GROUP BY DEVICE_TYPE
    ORDER BY EVENT_COUNT DESC`,
    { warehouse: WH },
  )
  return rows.map((r) => ({
    device: r.DEVICE_TYPE,
    events: Number(r.EVENT_COUNT),
    users: Number(r.UNIQUE_USERS),
  }))
}

export async function getGeographicBreakdown() {
  const rows = await querySnowflake(
    `SELECT
      COUNTRY,
      CITY,
      COUNT(DISTINCT USER_ID) AS ACTIVE_USERS,
      COUNT(*) AS EVENT_COUNT
    FROM ${DB_SCHEMA}.CLICK_EVENTS
    WHERE EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP())
    GROUP BY COUNTRY, CITY
    ORDER BY ACTIVE_USERS DESC
    LIMIT 15`,
    { warehouse: WH },
  )
  return rows.map((r) => ({
    country: r.COUNTRY,
    city: r.CITY,
    activeUsers: Number(r.ACTIVE_USERS),
    events: Number(r.EVENT_COUNT),
  }))
}

export async function getCategoryPerformance() {
  const rows = await querySnowflake(
    `SELECT
      PRODUCT_CATEGORY,
      COUNT(CASE WHEN EVENT_TYPE = 'product_view' THEN 1 END) AS VIEWS,
      COUNT(CASE WHEN EVENT_TYPE = 'add_to_cart' THEN 1 END) AS CART_ADDS,
      COUNT(CASE WHEN EVENT_TYPE = 'purchase' THEN 1 END) AS PURCHASES,
      COALESCE(SUM(CASE WHEN EVENT_TYPE = 'purchase' THEN PRODUCT_PRICE * QUANTITY END), 0) AS REVENUE
    FROM ${DB_SCHEMA}.CLICK_EVENTS
    WHERE EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP())
      AND PRODUCT_CATEGORY != ''
    GROUP BY PRODUCT_CATEGORY
    ORDER BY REVENUE DESC`,
    { warehouse: WH },
  )
  return rows.map((r) => ({
    category: r.PRODUCT_CATEGORY,
    views: Number(r.VIEWS),
    cartAdds: Number(r.CART_ADDS),
    purchases: Number(r.PURCHASES),
    revenue: Number(r.REVENUE),
  }))
}

export async function getSessionAnalytics() {
  const rows = await querySnowflake(
    `WITH sessions AS (
      SELECT SESSION_ID,
        COUNT(*) AS page_count,
        TIMESTAMPDIFF(second, MIN(EVENT_TIMESTAMP), MAX(EVENT_TIMESTAMP)) AS duration_sec
      FROM ${DB_SCHEMA}.CLICK_EVENTS
      WHERE EVENT_TIMESTAMP >= DATEADD(minute, -5, CURRENT_TIMESTAMP())
      GROUP BY SESSION_ID
    )
    SELECT
      ROUND(AVG(page_count), 1) AS AVG_PAGES,
      ROUND(AVG(duration_sec), 1) AS AVG_DURATION_SEC,
      ROUND(COUNT(CASE WHEN page_count = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS BOUNCE_RATE,
      COUNT(*) AS TOTAL_SESSIONS
    FROM sessions`,
    { warehouse: WH },
  )
  return rows[0] || {}
}

export async function getRecentEvents() {
  const rows = await querySnowflake(
    `SELECT EVENT_TYPE, USER_ID, PRODUCT_NAME, CITY, COUNTRY, EVENT_TIMESTAMP
    FROM ${DB_SCHEMA}.CLICK_EVENTS
    ORDER BY EVENT_TIMESTAMP DESC
    LIMIT 20`,
    { warehouse: WH },
  )
  return rows.map((r) => ({
    eventType: r.EVENT_TYPE,
    userId: r.USER_ID,
    productName: r.PRODUCT_NAME,
    city: r.CITY,
    country: r.COUNTRY,
    timestamp: r.EVENT_TIMESTAMP,
  }))
}

export async function runSpeedQueries() {
  const speedQueries = [
    { label: "Point lookup (single user)", sql: `SELECT * FROM ${DB_SCHEMA}.CLICK_EVENTS WHERE USER_ID = 'user_0001' LIMIT 1` },
    { label: "Point lookup (single event)", sql: `SELECT * FROM ${DB_SCHEMA}.CLICK_EVENTS WHERE USER_ID = 'user_0050' AND EVENT_TYPE = 'purchase' LIMIT 1` },
    { label: "Count last 10 seconds", sql: `SELECT COUNT(*) AS C FROM ${DB_SCHEMA}.CLICK_EVENTS WHERE EVENT_TIMESTAMP >= DATEADD(second, -10, CURRENT_TIMESTAMP())` },
    { label: "Latest event", sql: `SELECT * FROM ${DB_SCHEMA}.CLICK_EVENTS ORDER BY EVENT_TIMESTAMP DESC LIMIT 1` },
    { label: "Distinct users (30s)", sql: `SELECT COUNT(DISTINCT USER_ID) AS C FROM ${DB_SCHEMA}.CLICK_EVENTS WHERE EVENT_TIMESTAMP >= DATEADD(second, -30, CURRENT_TIMESTAMP())` },
    { label: "Aggregate by device (1 min)", sql: `SELECT DEVICE_TYPE, COUNT(*) AS C FROM ${DB_SCHEMA}.CLICK_EVENTS WHERE EVENT_TIMESTAMP >= DATEADD(minute, -1, CURRENT_TIMESTAMP()) GROUP BY DEVICE_TYPE` },
    { label: "Top product (1 min)", sql: `SELECT PRODUCT_NAME, COUNT(*) AS C FROM ${DB_SCHEMA}.CLICK_EVENTS WHERE EVENT_TIMESTAMP >= DATEADD(minute, -1, CURRENT_TIMESTAMP()) AND PRODUCT_NAME != '' GROUP BY PRODUCT_NAME ORDER BY C DESC LIMIT 1` },
    { label: "Revenue sum (1 min)", sql: `SELECT COALESCE(SUM(PRODUCT_PRICE * QUANTITY), 0) AS R FROM ${DB_SCHEMA}.CLICK_EVENTS WHERE EVENT_TYPE = 'purchase' AND EVENT_TIMESTAMP >= DATEADD(minute, -1, CURRENT_TIMESTAMP())` },
  ]

  const results: { label: string; roundTripMs: number }[] = []

  for (const q of speedQueries) {
    const t0 = Date.now()
    await querySnowflake(q.sql, { warehouse: WH })
    results.push({ label: q.label, roundTripMs: Date.now() - t0 })
  }

  // Get actual Snowflake execution times from query history
  const historyRows = await querySnowflake(
    `SELECT QUERY_TEXT, EXECUTION_TIME, TOTAL_ELAPSED_TIME, COMPILATION_TIME
     FROM TABLE(ECOM_STREAMING.INFORMATION_SCHEMA.QUERY_HISTORY(RESULT_LIMIT => 20))
     WHERE WAREHOUSE_NAME = 'ECOM_IWH'
     ORDER BY START_TIME DESC`,
    { warehouse: WH },
  )

  // Match queries back to results by label/sql pattern
  return results.map((r) => {
    const match = historyRows.find((h) => {
      const qt = (h.QUERY_TEXT || "").toLowerCase()
      if (r.label.includes("single user")) return qt.includes("user_0001") && qt.includes("limit 1")
      if (r.label.includes("single event")) return qt.includes("user_0050") && qt.includes("purchase")
      if (r.label.includes("Count last 10")) return qt.includes("dateadd(second, -10")
      if (r.label.includes("Latest event")) return qt.includes("order by event_timestamp desc") && qt.includes("limit 1") && !qt.includes("user_")
      if (r.label.includes("Distinct users")) return qt.includes("count(distinct user_id")
      if (r.label.includes("Aggregate by device")) return qt.includes("device_type") && qt.includes("group by device_type")
      if (r.label.includes("Top product")) return qt.includes("product_name") && qt.includes("order by c desc")
      if (r.label.includes("Revenue sum")) return qt.includes("sum(product_price")
      return false
    })
    return {
      label: r.label,
      roundTripMs: r.roundTripMs,
      executionMs: match ? Number(match.EXECUTION_TIME) : null,
      compilationMs: match ? Number(match.COMPILATION_TIME) : null,
      totalElapsedMs: match ? Number(match.TOTAL_ELAPSED_TIME) : null,
    }
  })
}

export async function runBurstQueries(concurrency: number) {
  const queries = Array.from({ length: concurrency }, (_, i) => {
    const userId = `user_${String(i % 400).padStart(4, "0")}`
    return querySnowflake(
      `SELECT EVENT_TYPE, PRODUCT_NAME, EVENT_TIMESTAMP
       FROM ${DB_SCHEMA}.CLICK_EVENTS
       WHERE USER_ID = '${userId}'
       ORDER BY EVENT_TIMESTAMP DESC
       LIMIT 5`,
      { warehouse: WH },
    )
  })

  const latencies: number[] = []
  const t0 = Date.now()

  const results = await Promise.allSettled(
    queries.map(async (q) => {
      const qt0 = Date.now()
      await q
      latencies.push(Date.now() - qt0)
    }),
  )

  const wallClockMs = Date.now() - t0
  latencies.sort((a, b) => a - b)
  const successful = results.filter((r) => r.status === "fulfilled").length

  // Fetch actual Snowflake execution times from QUERY_HISTORY
  let execStats = { avgExecMs: 0, p50ExecMs: 0, p95ExecMs: 0, maxExecMs: 0 }
  try {
    const histRows = await querySnowflake(
      `SELECT EXECUTION_TIME
       FROM TABLE(ECOM_STREAMING.INFORMATION_SCHEMA.QUERY_HISTORY(RESULT_LIMIT => ${Math.min(concurrency + 10, 200)}))
       WHERE WAREHOUSE_NAME = 'ECOM_IWH'
         AND QUERY_TYPE = 'SELECT'
         AND EXECUTION_STATUS = 'SUCCESS'
         AND QUERY_TEXT ILIKE '%CLICK_EVENTS%WHERE USER_ID%'
       ORDER BY START_TIME DESC
       LIMIT ${concurrency}`,
      { warehouse: WH },
    )
    if (histRows.length > 0) {
      const execTimes = histRows.map((r) => Number(r.EXECUTION_TIME)).sort((a, b) => a - b)
      execStats = {
        avgExecMs: Math.round(execTimes.reduce((a, b) => a + b, 0) / execTimes.length),
        p50ExecMs: execTimes[Math.floor(execTimes.length * 0.5)] || 0,
        p95ExecMs: execTimes[Math.floor(execTimes.length * 0.95)] || 0,
        maxExecMs: execTimes[execTimes.length - 1] || 0,
      }
    }
  } catch {}

  return {
    totalQueries: concurrency,
    successful,
    wallClockMs,
    qps: Math.round((successful / wallClockMs) * 1000 * 10) / 10,
    // Round-trip latencies (client → Snowflake → client)
    rt: {
      p50: latencies[Math.floor(latencies.length * 0.5)] || 0,
      p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99: latencies[Math.floor(latencies.length * 0.99)] || 0,
      max: latencies[latencies.length - 1] || 0,
    },
    // Actual Snowflake execution times (from QUERY_HISTORY)
    exec: execStats,
  }
}
