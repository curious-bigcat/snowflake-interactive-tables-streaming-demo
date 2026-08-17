# Real-Time E-Commerce Clickstream Analytics

End-to-end real-time analytics demo: e-commerce clickstream events flow from a Python data generator through Apache Kafka and Snowpipe Streaming v2 into a Snowflake Interactive Table, then are queried at sub-100ms execution latency by a Next.js dashboard running on an Interactive Warehouse, deployed to SPCS (Snowpark Container Services).

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌───────────────────────────────────┐
│  Python Clickstream │────▶│  Apache Kafka    │────▶│  Snowflake Kafka Connector v4.0   │
│  Generator          │     │  (KRaft Mode)    │     │  (Snowpipe Streaming v2)          │
│  (dynamic load)     │     │  (Docker)        │     │  (SnowflakeStreamingSinkConnector) │
└─────────────────────┘     └──────────────────┘     └───────────────┬───────────────────┘
                                                                     │
                                                                     ▼
┌─────────────────────┐     ┌──────────────────┐     ┌──────────────────────────────────┐
│  Next.js Dashboard  │────▶│  Interactive     │◀────│  Interactive Table                │
│  (SPCS Container)   │     │  Warehouse       │     │  (CLICK_EVENTS, clustered)       │
│  Auto-refresh 3s    │     │  (ECOM_IWH)      │     │  50K-700K+ rows streaming       │
└─────────────────────┘     └──────────────────┘     └──────────────────────────────────┘
```

## Performance Results

Measured from Snowsight notebook (zero network overhead):

| Query Type | Execution Time | Speed Tier |
|------------|---------------|------------|
| COUNT(*) with 10s time filter | 2-4ms | Sub-10ms |
| Revenue SUM (1 min) | 37-45ms | Sub-50ms |
| GROUP BY device_type | 46-58ms | Sub-50ms |
| Conversion funnel aggregation | 53-58ms | Sub-100ms |
| ORDER BY timestamp DESC LIMIT 1 | 64-92ms | Sub-100ms |
| **Average across all queries** | **47ms** | **Sub-100ms** |

**100% of queries execute sub-100ms** on the Interactive Warehouse with warm cache.

## Prerequisites

- Docker Desktop
- Python 3.9+ (`python3`, `pip3`)
- Node.js 18+
- Snowflake account with Interactive Tables enabled (check [region availability](https://docs.snowflake.com/en/user-guide/interactive#region-availability))

## Quick Start

### 1. Set up Snowflake objects

Run the setup SQL in Snowsight or SnowSQL:

```sql
-- Creates: database, schema, Kafka role/user, Interactive Table, Interactive Warehouse
-- See snowflake/01_setup.sql for full script
```

```bash
snowsql -f snowflake/01_setup.sql
```

Then generate RSA keys for the Kafka connector:

```bash
cd kafka && mkdir -p keys
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out keys/rsa_key.p8 -nocrypt
openssl rsa -in keys/rsa_key.p8 -pubout -out keys/rsa_key.pub
```

Set the public key on the Kafka user:

```sql
ALTER USER KAFKA_ECOM_USER SET RSA_PUBLIC_KEY = '<paste key without BEGIN/END lines>';
```

**Important:** Grant ownership of the Interactive Table to the Kafka role:

```sql
GRANT OWNERSHIP ON TABLE ECOM_STREAMING.CLICKSTREAM.CLICK_EVENTS TO ROLE KAFKA_ECOM_ROLE COPY CURRENT GRANTS;
```

### 2. Start Kafka

```bash
cd kafka
docker compose up -d
# Wait for healthy status (~60 seconds for Kafka Connect)
docker compose ps
```

### 3. Create Kafka topic

```bash
docker exec -it kafka-ecom kafka-topics --create \
  --topic ecom_clickstream \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1
```

### 4. Deploy the Kafka connector

```bash
export SNOWFLAKE_ACCOUNT="YOUR-ORG-YOUR-ACCOUNT"
./deploy-connector.sh
```

Verify all 3 tasks are RUNNING:

```bash
curl -s http://localhost:8083/connectors/snowflake-ecom-clickstream/status | python3 -m json.tool
```

### 5. Start the data generator

```bash
cd ../generator
pip3 install -r requirements.txt

# Test with a single event
python3 send_event.py

# Verify in Snowflake
# SELECT COUNT(*) FROM ECOM_STREAMING.CLICKSTREAM.CLICK_EVENTS;

# Start continuous generation with dynamic load
python3 generate_clickstream.py --rate 50 --duration 10 --min-users 30 --max-users 300
```

### 6. Run the dashboard locally

```bash
cd ../dashboard
npm install
npm run dev
# Open http://localhost:3000
```

### 7. Deploy to SPCS (Snowpark Container Services)

```bash
cd ../dashboard

# Build Docker image
docker build --platform linux/amd64 -t ecom-dashboard:latest .

# Login to Snowflake registry
snow spcs image-registry login --connection <your-connection>

# Tag and push
docker tag ecom-dashboard:latest <account>.registry.snowflakecomputing.com/ecom_streaming/clickstream/images/ecom-dashboard:latest
docker push <account>.registry.snowflakecomputing.com/ecom_streaming/clickstream/images/ecom-dashboard:latest

# Create the service (run in Snowflake)
```

```sql
CREATE IMAGE REPOSITORY IF NOT EXISTS ECOM_STREAMING.CLICKSTREAM.IMAGES;

CREATE SERVICE ECOM_STREAMING.CLICKSTREAM.ECOM_DASHBOARD_SVC
  IN COMPUTE POOL <your_compute_pool>
  FROM SPECIFICATION $$
  spec:
    containers:
    - name: dashboard
      image: /ecom_streaming/clickstream/images/ecom-dashboard:latest
      env:
        HOSTNAME: "0.0.0.0"
        PORT: "8080"
        NODE_ENV: production
        SNOWFLAKE_WAREHOUSE: ECOM_IWH
        SNOWFLAKE_DATABASE: ECOM_STREAMING
        SNOWFLAKE_SCHEMA: CLICKSTREAM
      resources:
        requests:
          memory: 1Gi
          cpu: 500m
        limits:
          memory: 2Gi
          cpu: 1000m
      readinessProbe:
        port: 8080
        path: /
    endpoints:
    - name: dashboard
      port: 8080
      public: true
  $$
  MIN_INSTANCES = 1
  MAX_INSTANCES = 1;

-- Get the URL
SHOW ENDPOINTS IN SERVICE ECOM_STREAMING.CLICKSTREAM.ECOM_DASHBOARD_SVC;
```

To update after code changes:

```bash
docker build --platform linux/amd64 -t ecom-dashboard:latest .
docker tag ecom-dashboard:latest <account>.registry.snowflakecomputing.com/ecom_streaming/clickstream/images/ecom-dashboard:latest
snow spcs image-registry login --connection <your-connection>
docker push <account>.registry.snowflakecomputing.com/ecom_streaming/clickstream/images/ecom-dashboard:latest

-- Then in Snowflake:
ALTER SERVICE ECOM_STREAMING.CLICKSTREAM.ECOM_DASHBOARD_SVC FROM SPECIFICATION $$ ... $$;
```

## Project Structure

```
streaming-ecommerce/
├── snowflake/
│   ├── 01_setup.sql                              # Database, IT, IWH, user/role
│   ├── 02_cleanup.sql                            # Drop all objects
│   └── INTERACTIVE_TABLES_LATENCY_BENCHMARK.ipynb # Snowsight notebook for latency testing
├── kafka/
│   ├── docker-compose.yml          # Kafka (KRaft) + Kafka Connect
│   ├── Dockerfile.connect          # Kafka Connect + Snowflake Connector v4.0
│   ├── deploy-connector.sh         # Deploy Snowpipe Streaming v2 connector
│   └── monitor.sh                  # Pipeline health check
├── generator/
│   ├── requirements.txt            # confluent-kafka, faker
│   ├── generate_clickstream.py     # Dynamic load generator (sine wave + surges)
│   └── send_event.py              # Single event for testing
├── dashboard/                      # Next.js app (SPCS deployment)
│   ├── Dockerfile                  # Multi-stage build for SPCS
│   ├── .dockerignore
│   ├── app.yml                     # SAR app config
│   ├── snowflake.yml               # Snow CLI definition
│   ├── app/
│   │   ├── page.tsx                # Main dashboard page
│   │   └── api/                    # API routes (metrics, funnel, trending, etc.)
│   ├── components/
│   │   ├── metric-cards.tsx        # Active users, events/sec, revenue, conversion
│   │   ├── conversion-funnel.tsx   # 5-stage funnel visualization
│   │   ├── revenue-chart.tsx       # Revenue per minute (area chart)
│   │   ├── trending-products.tsx   # Top 10 products table
│   │   ├── category-performance.tsx # Revenue by category (bar chart)
│   │   ├── geo-table.tsx           # Geographic breakdown table
│   │   ├── session-analytics.tsx   # Avg pages, duration, bounce rate
│   │   ├── event-stream.tsx        # Live event ticker (last 20 events)
│   │   ├── device-breakdown.tsx    # Device split (donut chart)
│   │   ├── performance-bar.tsx     # Sub-10ms/50ms/100ms progress bars
│   │   ├── latency-kpis.tsx        # Business KPIs with latency tier badges
│   │   ├── speed-test.tsx          # Per-query latency test with QUERY_HISTORY
│   │   └── qps-panel.tsx           # QPS burst test (50-500 concurrent queries)
│   └── lib/
│       ├── snowflake.ts            # Snowflake SDK connection helper (SPCS + local)
│       └── queries.ts              # All SQL queries + execution stats
└── README.md
```

## Dashboard Features

### Analytics Panels
- **Metric Cards**: Active users (60s), events/sec (30s), revenue (5 min), conversion rate
- **Conversion Funnel**: page_view → product_view → add_to_cart → checkout → purchase
- **Revenue Timeline**: Per-minute revenue chart (last 30 min)
- **Trending Products**: Top 10 by views
- **Category Performance**: Revenue by product category (horizontal bar chart)
- **Geographic Breakdown**: Active users by country/city
- **Session Analytics**: Avg pages/session, avg duration, bounce rate
- **Live Event Stream**: Color-coded ticker of last 20 events (refreshes every 2s)
- **Device Breakdown**: Desktop/mobile/tablet split (donut chart)

### Performance Panels
- **Performance Bar**: Sub-10ms / Sub-50ms / Sub-100ms query counts from QUERY_HISTORY
- **Latency KPIs**: Business metrics (events, revenue, funnel) with their execution latency tier
- **Speed Test**: Runs 8 queries and shows per-query execution time from QUERY_HISTORY
- **QPS Burst Test**: Fires 50-500 concurrent queries, shows throughput + latency histogram (exec vs round-trip)

### Controls
- **Refresh interval dropdown**: 3s / 5s / 10s
- **Live QPS counter**: Tracks dashboard query rate
- **Global latency header**: Avg execution + compilation from QUERY_HISTORY

## Data Generator

The generator simulates realistic e-commerce traffic with:

- **Dynamic load**: Active user count oscillates via sine wave (`--min-users` to `--max-users`)
- **Traffic surges**: Random 2-3x spikes (2% probability per cycle)
- **Realistic funnel**: page_view (100%) → product_view (65%) → add_to_cart (30%) → checkout (15%) → purchase (5%)
- **Product catalog**: 50 products across 5 categories (Electronics, Clothing, Home & Kitchen, Sports, Books)
- **Geographic diversity**: 10 countries, 50 cities
- **Device distribution**: Desktop 40%, Mobile 45%, Tablet 15%

```bash
# High-volume stress test
python3 generate_clickstream.py --rate 5000 --duration 120 --min-users 30 --max-users 3000

# Normal demo load
python3 generate_clickstream.py --rate 50 --duration 10 --min-users 30 --max-users 300
```

## Key Technical Details

### Kafka Connector (v4.0 GA)

The connector uses `SnowflakeStreamingSinkConnector` (not `SnowflakeSinkConnector`) which supports Snowpipe Streaming v2 — the only ingestion path that can write to Interactive Tables.

Key config properties:
```json
{
  "connector.class": "com.snowflake.kafka.connector.SnowflakeStreamingSinkConnector",
  "snowflake.ingestion.method": "SNOWPIPE_STREAMING",
  "snowflake.enable.schematization": "TRUE",
  "snowflake.streaming.v2.enabled": "true",
  "snowflake.streaming.validate.compatibility.with.classic": "false"
}
```

### Common Issues & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| "Table already exists, no privileges" | Table ownership mismatch | `GRANT OWNERSHIP ON TABLE ... TO ROLE KAFKA_ECOM_ROLE COPY CURRENT GRANTS` |
| "Token has expired" | Connector auth token expired after hours | Delete and redeploy connector: `curl -X DELETE .../connectors/...; ./deploy-connector.sh` |
| "Cannot ingest into interactive tables" | Using old connector (v2.4.1) | Must use connector v4.0+ with `SnowflakeStreamingSinkConnector` |
| "SnowflakeStreamingSinkConnector not found" | Wrong connector version installed | Use connector 4.0.0 from Maven Central (not confluent-hub 2.x) |
| "snowflake.url.name is not valid" | Wrong account format | Use just `ORG-ACCOUNT` (e.g., `SFSEAPAC-BSURESH`), connector appends `.snowflakecomputing.com` |
| "validate.compatibility.with.classic" error | v4 migration checks enabled | Add `"snowflake.streaming.validate.compatibility.with.classic": "false"` |
| Dashboard shows 300-400ms latency locally | Network overhead (local → Snowflake cloud) | Deploy to SPCS; actual Snowflake execution is sub-100ms (verify with QUERY_HISTORY) |
| Same latency on all widgets | Using global average instead of per-query | Use per-route `Date.now()` measurement (queryMs) |
| New Interactive Table not fast | Not attached to IWH cache | `ALTER WAREHOUSE ECOM_IWH ADD TABLES (<new_table>)` |

### Latency Breakdown (from SPCS)

| Layer | Time | Notes |
|-------|------|-------|
| Snowflake Execution | 2-92ms | The actual query work on Interactive Warehouse |
| SQL Compilation | 50-98ms | Parsing + optimization (warms up with repeated queries) |
| SDK/API overhead | ~200ms | Node.js SDK → REST API → response serialization |
| **Total (per widget)** | **~300-400ms** | SDK overhead dominates |
| **True Snowflake time** | **~120-180ms** | exec + compile (visible in QUERY_HISTORY) |

### Verifying True Latency

Use the Snowsight notebook (`INTERACTIVE_TABLES_LATENCY_BENCHMARK.ipynb`) to measure execution time with zero SDK overhead:

```sql
-- Disable result cache
ALTER SESSION SET USE_CACHED_RESULT = FALSE;

-- Run queries, then check:
SELECT QUERY_TEXT, EXECUTION_TIME, COMPILATION_TIME, TOTAL_ELAPSED_TIME
FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY_BY_SESSION(RESULT_LIMIT => 30))
WHERE WAREHOUSE_NAME = 'ECOM_IWH' AND QUERY_TYPE = 'SELECT'
ORDER BY START_TIME;
```

## Cleanup

```bash
# Stop generator (Ctrl+C)

# Remove Kafka connector
curl -X DELETE http://localhost:8083/connectors/snowflake-ecom-clickstream

# Stop Kafka
cd kafka && docker compose down -v

# Drop SPCS service
# DROP SERVICE ECOM_STREAMING.CLICKSTREAM.ECOM_DASHBOARD_SVC;

# Drop all Snowflake objects
snowsql -f snowflake/02_cleanup.sql
```

## References

- [Snowflake Interactive Tables Documentation](https://docs.snowflake.com/en/user-guide/interactive)
- [Snowpipe Streaming v2 (High-Performance Architecture)](https://docs.snowflake.com/en/user-guide/snowpipe-streaming/snowpipe-streaming-high-performance-overview)
- [Snowflake Kafka Connector v4.0](https://docs.snowflake.com/en/release-notes/2026/other/2026-04-20-kafka-connector-v4-ga)
- [Interactive Table Performance Considerations](https://docs.snowflake.com/en/user-guide/interactive#interactive-table-performance-considerations)
- [Snowpark Container Services](https://docs.snowflake.com/en/developer-guide/snowpark-container-services/overview)
