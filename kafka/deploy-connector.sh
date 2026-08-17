#!/bin/bash
# Deploy the Snowflake Kafka Connector for e-commerce clickstream streaming.
# Usage: ./deploy-connector.sh
#
# Prerequisites:
#   - SNOWFLAKE_ACCOUNT env var set (e.g. "myorg-myacct")
#   - RSA private key at ./keys/rsa_key.p8
#   - Kafka Connect running on localhost:8083

set -euo pipefail

if [ -z "${SNOWFLAKE_ACCOUNT:-}" ]; then
  echo "ERROR: Set SNOWFLAKE_ACCOUNT env var (e.g. export SNOWFLAKE_ACCOUNT=myorg-myacct)"
  exit 1
fi

KEY_FILE="keys/rsa_key.p8"
if [ ! -f "$KEY_FILE" ]; then
  echo "ERROR: Private key not found at $KEY_FILE"
  echo "Generate with: openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out keys/rsa_key.p8 -nocrypt"
  exit 1
fi

PRIVATE_KEY=$(grep -v "BEGIN\|END" "$KEY_FILE" | tr -d '\n')

echo "Deploying Snowflake Kafka connector..."
echo "  Account: ${SNOWFLAKE_ACCOUNT}"
echo "  Target:  ECOM_STREAMING.CLICKSTREAM.CLICK_EVENTS"

curl -s -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "snowflake-ecom-clickstream",
    "config": {
        "connector.class": "com.snowflake.kafka.connector.SnowflakeStreamingSinkConnector",
        "tasks.max": "3",
        "topics": "ecom_clickstream",
        "snowflake.url.name": "'"${SNOWFLAKE_ACCOUNT}"'.snowflakecomputing.com",
        "snowflake.user.name": "KAFKA_ECOM_USER",
        "snowflake.private.key": "'"${PRIVATE_KEY}"'",
        "snowflake.database.name": "ECOM_STREAMING",
        "snowflake.schema.name": "CLICKSTREAM",
        "snowflake.role.name": "KAFKA_ECOM_ROLE",
        "snowflake.ingestion.method": "SNOWPIPE_STREAMING",
        "snowflake.enable.schematization": "TRUE",
        "snowflake.topic2table.map": "ecom_clickstream:CLICK_EVENTS",
        "key.converter": "org.apache.kafka.connect.storage.StringConverter",
        "value.converter": "org.apache.kafka.connect.json.JsonConverter",
        "value.converter.schemas.enable": "false",
        "buffer.flush.time": "10",
        "buffer.count.records": "10000",
        "buffer.size.bytes": "20000000",
        "errors.tolerance": "all",
        "errors.log.enable": "true",
        "snowflake.streaming.enable.altering.target.pipes.tables": "false",
        "snowflake.streaming.v2.enabled": "true",
        "snowflake.streaming.validate.compatibility.with.classic": "false"
    }
}' | python3 -m json.tool

echo ""
echo "Connector deployed. Check status with:"
echo "  curl -s http://localhost:8083/connectors/snowflake-ecom-clickstream/status | python3 -m json.tool"
