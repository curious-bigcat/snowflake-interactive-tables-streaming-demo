#!/bin/bash
# Monitor the streaming pipeline: Kafka lag, connector status, table row count.
# Usage: ./monitor.sh [--loop]

set -euo pipefail

CONNECTOR_NAME="snowflake-ecom-clickstream"
CONNECT_URL="http://localhost:8083"

echo "=== E-Commerce Streaming Pipeline Monitor ==="
echo ""

# Kafka Connect status
echo "--- Kafka Connector Status ---"
STATUS=$(curl -s "${CONNECT_URL}/connectors/${CONNECTOR_NAME}/status" 2>/dev/null || echo '{"error":"connect unavailable"}')
if echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"Connector: {d['connector']['state']}\")" 2>/dev/null; then
  echo "$STATUS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for t in d.get('tasks', []):
    print(f\"  Task {t['id']}: {t['state']}\")
" 2>/dev/null
else
  echo "  Kafka Connect not reachable at ${CONNECT_URL}"
fi

echo ""

# Kafka consumer lag
echo "--- Kafka Consumer Lag ---"
docker exec kafka-ecom kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe \
  --group connect-${CONNECTOR_NAME} 2>/dev/null || echo "  Kafka not reachable"

echo ""

# Snowflake row count (requires snowsql or similar)
echo "--- Snowflake Table Status ---"
echo "  Run in Snowflake:"
echo "    SELECT COUNT(*) AS ROWS, MAX(EVENT_TIMESTAMP) AS LATEST"
echo "    FROM ECOM_STREAMING.CLICKSTREAM.CLICK_EVENTS;"
echo ""

if [ "${1:-}" = "--loop" ]; then
  echo "Refreshing every 10 seconds (Ctrl+C to stop)..."
  sleep 10
  exec "$0" --loop
fi
