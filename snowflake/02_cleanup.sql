-- =============================================================================
-- Cleanup: Drop all streaming demo objects
-- =============================================================================

USE ROLE ACCOUNTADMIN;

DROP INTERACTIVE WAREHOUSE IF EXISTS ECOM_IWH;
DROP TABLE IF EXISTS ECOM_STREAMING.CLICKSTREAM.CLICK_EVENTS;
DROP SCHEMA IF EXISTS ECOM_STREAMING.CLICKSTREAM;
DROP DATABASE IF EXISTS ECOM_STREAMING;
DROP USER IF EXISTS KAFKA_ECOM_USER;
DROP ROLE IF EXISTS KAFKA_ECOM_ROLE;

SELECT 'Cleanup complete.' AS STATUS;
