-- =============================================================================
-- Real-Time E-Commerce Clickstream Analytics
-- Snowflake Setup: Database, Interactive Table, Interactive Warehouse, Kafka User
-- =============================================================================

USE ROLE ACCOUNTADMIN;

-- -----------------------------------------------------------------------------
-- 1. Database & Schema
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS ECOM_STREAMING;
CREATE SCHEMA IF NOT EXISTS ECOM_STREAMING.CLICKSTREAM;

USE DATABASE ECOM_STREAMING;
USE SCHEMA CLICKSTREAM;

-- -----------------------------------------------------------------------------
-- 2. Kafka Connector Role & Privileges
-- -----------------------------------------------------------------------------
CREATE ROLE IF NOT EXISTS KAFKA_ECOM_ROLE;
GRANT USAGE ON DATABASE ECOM_STREAMING TO ROLE KAFKA_ECOM_ROLE;
GRANT USAGE ON SCHEMA ECOM_STREAMING.CLICKSTREAM TO ROLE KAFKA_ECOM_ROLE;
GRANT CREATE TABLE ON SCHEMA ECOM_STREAMING.CLICKSTREAM TO ROLE KAFKA_ECOM_ROLE;
GRANT INSERT ON ALL TABLES IN SCHEMA ECOM_STREAMING.CLICKSTREAM TO ROLE KAFKA_ECOM_ROLE;
GRANT INSERT ON FUTURE TABLES IN SCHEMA ECOM_STREAMING.CLICKSTREAM TO ROLE KAFKA_ECOM_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA ECOM_STREAMING.CLICKSTREAM TO ROLE KAFKA_ECOM_ROLE;
GRANT SELECT ON FUTURE TABLES IN SCHEMA ECOM_STREAMING.CLICKSTREAM TO ROLE KAFKA_ECOM_ROLE;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ECOM_STREAMING.CLICKSTREAM TO ROLE KAFKA_ECOM_ROLE;
GRANT ROLE KAFKA_ECOM_ROLE TO ROLE ACCOUNTADMIN;

-- -----------------------------------------------------------------------------
-- 3. Kafka User (RSA Key Pair Auth)
--    Generate keys first:
--      openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt
--      openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
--    Then paste the public key below (without BEGIN/END lines):
-- -----------------------------------------------------------------------------
CREATE USER IF NOT EXISTS KAFKA_ECOM_USER
  DEFAULT_ROLE = KAFKA_ECOM_ROLE
  MUST_CHANGE_PASSWORD = FALSE;

-- Uncomment and paste your public key:
-- ALTER USER KAFKA_ECOM_USER SET RSA_PUBLIC_KEY = '<paste-public-key-here>';

GRANT ROLE KAFKA_ECOM_ROLE TO USER KAFKA_ECOM_USER;

-- -----------------------------------------------------------------------------
-- 4. Interactive Table: CLICK_EVENTS
--    Clustered by USER_ID and EVENT_TIMESTAMP for fast user-scoped time queries
-- -----------------------------------------------------------------------------
CREATE OR REPLACE INTERACTIVE TABLE ECOM_STREAMING.CLICKSTREAM.CLICK_EVENTS (
    EVENT_ID        VARCHAR(64),
    EVENT_TYPE      VARCHAR(32),      -- page_view, product_view, add_to_cart, checkout, purchase
    USER_ID         VARCHAR(32),
    SESSION_ID      VARCHAR(64),
    PRODUCT_ID      VARCHAR(32),
    PRODUCT_NAME    VARCHAR(256),
    PRODUCT_CATEGORY VARCHAR(64),
    PRODUCT_PRICE   FLOAT,
    QUANTITY        INTEGER,
    PAGE_URL        VARCHAR(512),
    REFERRER        VARCHAR(256),
    DEVICE_TYPE     VARCHAR(16),      -- desktop, mobile, tablet
    BROWSER         VARCHAR(32),
    COUNTRY         VARCHAR(4),
    CITY            VARCHAR(128),
    EVENT_TIMESTAMP TIMESTAMP_NTZ
)
CLUSTER BY (USER_ID, EVENT_TIMESTAMP);

-- -----------------------------------------------------------------------------
-- 5. Interactive Warehouse
-- -----------------------------------------------------------------------------
CREATE OR REPLACE INTERACTIVE WAREHOUSE ECOM_IWH
  TABLES (ECOM_STREAMING.CLICKSTREAM.CLICK_EVENTS)
  WAREHOUSE_SIZE = 'LARGE'
  MAX_CLUSTER_COUNT = 2
  MIN_CLUSTER_COUNT = 2;

-- -----------------------------------------------------------------------------
-- 6. Grant query access to ACCOUNTADMIN (or your app role)
-- -----------------------------------------------------------------------------
GRANT USAGE ON WAREHOUSE ECOM_IWH TO ROLE ACCOUNTADMIN;

-- Verify setup
SHOW INTERACTIVE TABLES IN SCHEMA ECOM_STREAMING.CLICKSTREAM;
SHOW INTERACTIVE WAREHOUSES LIKE 'ECOM_IWH';

SELECT 'Setup complete. Next: generate RSA keys, configure Kafka connector, start streaming.' AS STATUS;
