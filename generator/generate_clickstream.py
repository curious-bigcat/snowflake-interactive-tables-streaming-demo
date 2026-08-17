#!/usr/bin/env python3
"""
E-Commerce Clickstream Data Generator

Simulates realistic user sessions with event funnels:
  page_view -> product_view -> add_to_cart -> checkout -> purchase

Events are published to Kafka topic 'ecom_clickstream' as JSON.
"""

import argparse
import json
import math
import random
import time
import uuid
from datetime import datetime, timezone

from confluent_kafka import Producer

# ---------------------------------------------------------------------------
# Product catalog
# ---------------------------------------------------------------------------
CATEGORIES = {
    "Electronics": [
        ("Wireless Headphones", 79.99),
        ("Bluetooth Speaker", 49.99),
        ("USB-C Hub", 34.99),
        ("Mechanical Keyboard", 129.99),
        ("Webcam 4K", 89.99),
        ("Portable Charger", 29.99),
        ("Smart Watch", 249.99),
        ("Noise Cancelling Earbuds", 159.99),
        ("Gaming Mouse", 59.99),
        ("Monitor Stand", 44.99),
    ],
    "Clothing": [
        ("Running Shoes", 119.99),
        ("Denim Jacket", 89.99),
        ("Cotton T-Shirt", 24.99),
        ("Wool Sweater", 69.99),
        ("Cargo Pants", 54.99),
        ("Baseball Cap", 19.99),
        ("Leather Belt", 39.99),
        ("Athletic Socks 6-Pack", 14.99),
        ("Down Vest", 99.99),
        ("Hoodie", 49.99),
    ],
    "Home & Kitchen": [
        ("French Press", 34.99),
        ("Cast Iron Skillet", 44.99),
        ("Knife Set", 79.99),
        ("Cutting Board", 24.99),
        ("Blender", 59.99),
        ("Toaster Oven", 89.99),
        ("Dish Rack", 29.99),
        ("Measuring Cups", 12.99),
        ("Dutch Oven", 69.99),
        ("Espresso Machine", 299.99),
    ],
    "Sports & Outdoors": [
        ("Yoga Mat", 29.99),
        ("Resistance Bands", 19.99),
        ("Water Bottle", 14.99),
        ("Camping Tent", 199.99),
        ("Hiking Backpack", 89.99),
        ("Jump Rope", 12.99),
        ("Foam Roller", 24.99),
        ("Bike Light Set", 34.99),
        ("Fishing Rod", 59.99),
        ("Climbing Chalk Bag", 17.99),
    ],
    "Books & Media": [
        ("Python Cookbook", 39.99),
        ("Data Engineering Guide", 49.99),
        ("Science Fiction Novel", 14.99),
        ("Graphic Novel", 19.99),
        ("Vinyl Record", 29.99),
        ("Board Game", 44.99),
        ("Puzzle 1000pc", 16.99),
        ("Art Print", 24.99),
        ("Audiobook Subscription", 9.99),
        ("Magazine Annual", 34.99),
    ],
}

# Build flat product list with IDs
PRODUCTS = []
for cat, items in CATEGORIES.items():
    for i, (name, price) in enumerate(items):
        PRODUCTS.append({
            "id": f"prod_{cat[:3].lower()}_{i:03d}",
            "name": name,
            "category": cat,
            "price": price,
        })

DEVICES = ["desktop", "mobile", "tablet"]
DEVICE_WEIGHTS = [0.4, 0.45, 0.15]
BROWSERS = ["Chrome", "Safari", "Firefox", "Edge"]
COUNTRIES = ["US", "UK", "CA", "DE", "FR", "AU", "JP", "IN", "BR", "NL"]
COUNTRY_WEIGHTS = [0.35, 0.12, 0.10, 0.08, 0.07, 0.06, 0.06, 0.06, 0.05, 0.05]
CITIES = {
    "US": ["New York", "San Francisco", "Chicago", "Austin", "Seattle"],
    "UK": ["London", "Manchester", "Edinburgh", "Bristol", "Leeds"],
    "CA": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
    "DE": ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne"],
    "FR": ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux"],
    "AU": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
    "JP": ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Nagoya"],
    "IN": ["Mumbai", "Bangalore", "Delhi", "Hyderabad", "Chennai"],
    "BR": ["Sao Paulo", "Rio de Janeiro", "Brasilia", "Salvador", "Curitiba"],
    "NL": ["Amsterdam", "Rotterdam", "Utrecht", "The Hague", "Eindhoven"],
}
REFERRERS = ["google.com", "facebook.com", "instagram.com", "twitter.com", "direct", "email", "tiktok.com"]

# Funnel drop-off probabilities
FUNNEL_PROBS = {
    "page_view": 1.0,         # everyone starts here
    "product_view": 0.65,     # 65% view a product
    "add_to_cart": 0.30,      # 30% add to cart
    "checkout": 0.15,         # 15% start checkout
    "purchase": 0.05,         # 5% complete purchase
}

PAGES = ["/", "/deals", "/categories", "/search", "/account", "/wishlist"]


def create_producer(bootstrap_servers: str) -> Producer:
    return Producer({
        "bootstrap.servers": bootstrap_servers,
        "linger.ms": 5,
        "batch.num.messages": 1000,
        "queue.buffering.max.messages": 100000,
    })


def generate_session_events(user_id: str) -> list[dict]:
    """Generate a realistic sequence of events for one user session."""
    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    device = random.choices(DEVICES, weights=DEVICE_WEIGHTS)[0]
    browser = random.choice(BROWSERS)
    country = random.choices(COUNTRIES, weights=COUNTRY_WEIGHTS)[0]
    city = random.choice(CITIES[country])
    referrer = random.choice(REFERRERS)
    base_time = datetime.now(timezone.utc)

    events = []
    offset_ms = 0

    # Page view (always)
    page = random.choice(PAGES)
    events.append(_make_event(
        "page_view", user_id, session_id, None, None, None, 0, page,
        referrer, device, browser, country, city, base_time, offset_ms
    ))
    offset_ms += random.randint(500, 3000)

    # Product view
    if random.random() < FUNNEL_PROBS["product_view"]:
        product = random.choice(PRODUCTS)
        page_url = f"/products/{product['name'].lower().replace(' ', '-')}"
        events.append(_make_event(
            "product_view", user_id, session_id, product["id"],
            product["name"], product["category"], product["price"],
            page_url, referrer, device, browser, country, city, base_time, offset_ms
        ))
        offset_ms += random.randint(2000, 8000)

        # Sometimes view multiple products
        for _ in range(random.randint(0, 3)):
            product = random.choice(PRODUCTS)
            page_url = f"/products/{product['name'].lower().replace(' ', '-')}"
            events.append(_make_event(
                "product_view", user_id, session_id, product["id"],
                product["name"], product["category"], product["price"],
                page_url, referrer, device, browser, country, city, base_time, offset_ms
            ))
            offset_ms += random.randint(1500, 6000)

        # Add to cart
        if random.random() < (FUNNEL_PROBS["add_to_cart"] / FUNNEL_PROBS["product_view"]):
            quantity = random.choices([1, 2, 3], weights=[0.7, 0.2, 0.1])[0]
            events.append(_make_event(
                "add_to_cart", user_id, session_id, product["id"],
                product["name"], product["category"], product["price"],
                "/cart", referrer, device, browser, country, city, base_time, offset_ms,
                quantity=quantity
            ))
            offset_ms += random.randint(1000, 5000)

            # Checkout
            if random.random() < (FUNNEL_PROBS["checkout"] / FUNNEL_PROBS["add_to_cart"]):
                events.append(_make_event(
                    "checkout", user_id, session_id, product["id"],
                    product["name"], product["category"], product["price"],
                    "/checkout", referrer, device, browser, country, city, base_time, offset_ms,
                    quantity=quantity
                ))
                offset_ms += random.randint(5000, 15000)

                # Purchase
                if random.random() < (FUNNEL_PROBS["purchase"] / FUNNEL_PROBS["checkout"]):
                    events.append(_make_event(
                        "purchase", user_id, session_id, product["id"],
                        product["name"], product["category"], product["price"],
                        "/order-confirmation", referrer, device, browser, country, city,
                        base_time, offset_ms, quantity=quantity
                    ))

    return events


def _make_event(event_type, user_id, session_id, product_id, product_name,
                product_category, product_price, page_url, referrer, device,
                browser, country, city, base_time, offset_ms, quantity=1):
    from datetime import timedelta
    ts = base_time + timedelta(milliseconds=offset_ms)
    return {
        "event_id": f"evt_{uuid.uuid4().hex[:16]}",
        "event_type": event_type,
        "user_id": user_id,
        "session_id": session_id,
        "product_id": product_id or "",
        "product_name": product_name or "",
        "product_category": product_category or "",
        "product_price": product_price or 0.0,
        "quantity": quantity,
        "page_url": page_url,
        "referrer": referrer,
        "device_type": device,
        "browser": browser,
        "country": country,
        "city": city,
        "event_timestamp": ts.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
    }


def delivery_callback(err, msg):
    if err:
        print(f"  ERROR: {err}")


def main():
    parser = argparse.ArgumentParser(description="Generate e-commerce clickstream events to Kafka")
    parser.add_argument("-d", "--duration", type=float, default=5, help="Duration in minutes (default: 5)")
    parser.add_argument("-r", "--rate", type=int, default=50, help="Base target events per second (default: 50)")
    parser.add_argument("-u", "--users", type=int, default=400, help="Max user pool size (default: 400)")
    parser.add_argument("--min-users", type=int, default=30, help="Min active users in wave (default: 30)")
    parser.add_argument("--max-users", type=int, default=300, help="Max active users in wave (default: 300)")
    parser.add_argument("--wave-period", type=int, default=120, help="Wave period in seconds (default: 120)")
    parser.add_argument("-b", "--bootstrap", default="localhost:29092", help="Kafka bootstrap servers")
    parser.add_argument("-t", "--topic", default="ecom_clickstream", help="Kafka topic")
    args = parser.parse_args()

    producer = create_producer(args.bootstrap)
    user_pool = [f"user_{i:04d}" for i in range(args.users)]

    duration_sec = args.duration * 60
    total_sent = 0
    start = time.time()
    last_print = 0

    print(f"Starting clickstream generation:")
    print(f"  Duration: {args.duration} minute(s)")
    print(f"  Base rate: ~{args.rate} events/second")
    print(f"  User pool: {args.users} (active wave: {args.min_users}-{args.max_users})")
    print(f"  Wave period: {args.wave_period}s")
    print(f"  Topic: {args.topic}")
    print(f"  Bootstrap: {args.bootstrap}")
    print("Press Ctrl+C to stop early\n")

    try:
        while (time.time() - start) < duration_sec:
            loop_start = time.time()
            elapsed = loop_start - start

            # Dynamic active user count: sine wave + random surges
            wave = math.sin(2 * math.pi * elapsed / args.wave_period)
            active_count = int(args.min_users + (args.max_users - args.min_users) * (wave + 1) / 2)

            # Random traffic spike (2% chance per cycle, 2-3x multiplier)
            surge = False
            if random.random() < 0.02:
                active_count = min(int(active_count * random.uniform(2.0, 3.0)), args.users)
                surge = True

            # Scale rate proportionally to active users
            rate_scale = active_count / ((args.min_users + args.max_users) / 2)
            current_rate = max(1, int(args.rate * rate_scale))
            interval = 1.0 / current_rate

            # Pick from the active subset of users
            active_pool = user_pool[:active_count]
            user_id = random.choice(active_pool)
            events = generate_session_events(user_id)

            for event in events:
                producer.produce(
                    args.topic,
                    key=event["user_id"],
                    value=json.dumps(event).encode("utf-8"),
                    callback=delivery_callback,
                )
                total_sent += 1

            producer.poll(0)

            # Throttle to target rate
            elapsed_loop = time.time() - loop_start
            target_time = len(events) * interval
            if elapsed_loop < target_time:
                time.sleep(target_time - elapsed_loop)

            # Progress update every 3 seconds
            elapsed_total = time.time() - start
            if elapsed_total - last_print >= 3:
                last_print = elapsed_total
                rate = total_sent / elapsed_total
                surge_tag = " [SURGE]" if surge else ""
                print(f"\r  Sent: {total_sent:,} | {elapsed_total:.0f}s | Rate: {rate:.1f}/s | Active users: {active_count}{surge_tag}    ", end="", flush=True)

    except KeyboardInterrupt:
        print("\n\nStopping...")

    producer.flush(timeout=10)
    elapsed_total = time.time() - start
    print(f"\n\nGeneration complete!")
    print(f"  Total messages: {total_sent:,}")
    print(f"  Duration: {elapsed_total:.1f}s")
    print(f"  Avg rate: {total_sent / max(elapsed_total, 1):.1f} msg/s")


if __name__ == "__main__":
    main()
