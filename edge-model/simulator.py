"""
GridMind — Smart Meter Data Simulator.

Generates realistic streaming kWh data for multiple meters and
sends it to the Edge-AI API. Injects anomalous readings periodically
to demonstrate real-time theft / tampering detection.
"""

import time
import random
import requests

API_URL = "http://127.0.0.1:5000/predict"

# ── Simulated meters around Bangalore ────────────────────────────────
METERS = [
    {"Meter_ID": "BLR-M001", "lat": 12.9716, "lon": 77.5946, "baseline": 5.0},
    {"Meter_ID": "BLR-M002", "lat": 12.9352, "lon": 77.6245, "baseline": 7.5},
    {"Meter_ID": "BLR-M003", "lat": 13.0358, "lon": 77.5970, "baseline": 3.2},
    {"Meter_ID": "BLR-M004", "lat": 12.9063, "lon": 77.5857, "baseline": 6.0},
    {"Meter_ID": "BLR-M005", "lat": 12.9698, "lon": 77.7500, "baseline": 4.5},
]

# ── Anomaly injection config ─────────────────────────────────────────
ANOMALY_EVERY_N = 18          # inject anomaly roughly every N readings per meter
ANOMALY_VALUES = [0.01, 0.05, 99.9, 88.0, 0.0]  # theft drops & tamper spikes


def generate_normal_reading(baseline):
    """Produce a normal kWh reading with slight Gaussian noise."""
    return round(baseline + random.gauss(0, 0.3), 2)


def generate_anomalous_reading():
    """Pick a random anomalous value (theft-like drop or tamper spike)."""
    return random.choice(ANOMALY_VALUES)


def main():
    print("=" * 60)
    print("  GridMind Simulator — streaming to", API_URL)
    print("=" * 60)

    reading_num = {m["Meter_ID"]: 0 for m in METERS}

    while True:
        for meter in METERS:
            mid = meter["Meter_ID"]
            reading_num[mid] += 1

            # Decide normal vs anomalous
            if reading_num[mid] > 0 and reading_num[mid] % ANOMALY_EVERY_N == 0:
                kwh = generate_anomalous_reading()
                tag = "⚡ INJECTED ANOMALY"
            else:
                kwh = generate_normal_reading(meter["baseline"])
                tag = "   normal"

            payload = {
                "Meter_ID": mid,
                "kWh": kwh,
                "lat": meter["lat"],
                "lon": meter["lon"],
            }

            try:
                resp = requests.post(API_URL, json=payload, timeout=5)
                result = resp.json()
                label = result.get("label", "?")
                print(f"[{tag}] {mid} | kWh={kwh:>7.2f} | API says: {label}")
            except requests.exceptions.ConnectionError:
                print(f"[ERROR] Cannot reach {API_URL} — is the edge model running?")
                time.sleep(3)
                continue

        # Pause between rounds to simulate 15-min interval telemetry
        # (compressed to 2 seconds for demo purposes)
        time.sleep(2)


if __name__ == "__main__":
    main()
