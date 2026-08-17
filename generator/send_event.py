#!/usr/bin/env python3
"""Send a single clickstream event to Kafka for testing end-to-end connectivity."""

import json
import sys
from confluent_kafka import Producer


def main():
    if len(sys.argv) < 2:
        event = {
            "event_id": "evt_test_001",
            "event_type": "product_view",
            "user_id": "user_0001",
            "session_id": "sess_test_001",
            "product_id": "prod_ele_000",
            "product_name": "Wireless Headphones",
            "product_category": "Electronics",
            "product_price": 79.99,
            "quantity": 1,
            "page_url": "/products/wireless-headphones",
            "referrer": "google.com",
            "device_type": "mobile",
            "browser": "Chrome",
            "country": "US",
            "city": "San Francisco",
            "event_timestamp": "2026-08-17T10:30:15.123Z",
        }
    else:
        event = json.loads(sys.argv[1])

    producer = Producer({"bootstrap.servers": "localhost:29092"})

    def on_delivery(err, msg):
        if err:
            print(f"ERROR: {err}")
        else:
            print(f"Message sent successfully!")
            print(f"  Topic: {msg.topic()}")
            print(f"  Partition: {msg.partition()}")
            print(f"  Offset: {msg.offset()}")

    producer.produce(
        "ecom_clickstream",
        key=event.get("user_id", "test"),
        value=json.dumps(event).encode("utf-8"),
        callback=on_delivery,
    )
    producer.flush(timeout=10)


if __name__ == "__main__":
    main()
