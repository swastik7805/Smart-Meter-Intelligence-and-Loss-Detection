"""
GridMind — Edge-AI Anomaly Detector.

Ultra-lightweight Monte Carlo / Frequency-based statistical model.
Designed to run on edge devices (e.g., inside a smart meter).
Learns the baseline in real-time via online learning and flags
sudden consumption drops/spikes as anomalies.
"""

import collections as cl
import flask
from db import insert_anomaly

# ── Flask app ────────────────────────────────────────────────────────
app = flask.Flask(__name__)

# ── Online-learning state (per meter) ────────────────────────────────
# freq_table[meter_id][kwh_value] = count of times we've seen that value
freq_table = cl.defaultdict(lambda: cl.defaultdict(int))
# total_count[meter_id] = total readings received for that meter
total_count = cl.defaultdict(int)

# ── Tuning knobs ─────────────────────────────────────────────────────
ALERT_THRESHOLD = 0.005   # flag if historical frequency < 0.5 %
WARMUP_READINGS = 20      # don't flag until we've seen at least N readings


@app.route("/health", methods=["GET"])
def health():
    """Simple health-check endpoint."""
    return flask.jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    """
    Receive a single smart-meter reading and classify it.

    Expected JSON body:
        {
            "Meter_ID": "M001",
            "kWh": 5.2,
            "lat": 12.9716,
            "lon": 77.5946
        }
    """
    content = flask.request.json
    if not content:
        return flask.jsonify({"error": "Empty request body"}), 400

    meter_id = content.get("Meter_ID", "UNKNOWN")
    kwh = content.get("kWh")
    lat = content.get("lat", 0.0)
    lon = content.get("lon", 0.0)

    if kwh is None:
        return flask.jsonify({"error": "Missing kWh field"}), 400

    # ── Online learning: update frequency table ──────────────────────
    total_count[meter_id] += 1
    freq_table[meter_id][kwh] += 1
    count = total_count[meter_id]
    freq = freq_table[meter_id][kwh] / count

    # ── Default: non-anomalous ───────────────────────────────────────
    result = {
        "Meter_ID": meter_id,
        "kWh": kwh,
        "prob": round(freq, 6),
        "label": "normal",
        "severity": "NONE",
        "is_anomaly": False,
    }

    # ── Anomaly detection (only after warm-up) ───────────────────────
    if count >= WARMUP_READINGS and freq < ALERT_THRESHOLD:
        result.update({
            "prob": round(1 - freq, 6),
            "label": "anomaly",
            "severity": "HIGH",
            "is_anomaly": True,
        })
        # Push to PostgreSQL immediately
        try:
            insert_anomaly(meter_id, kwh, lat, lon, "HIGH", round(1 - freq, 6))
            result["db_status"] = "pushed"
        except Exception as e:
            print(f"[DB ERROR] {e}")
            result["db_status"] = "failed"

        print(f"🚨 ANOMALY | Meter={meter_id} | kWh={kwh} | freq={freq:.6f}")
    else:
        if count < WARMUP_READINGS:
            print(f"   WARMUP  | Meter={meter_id} | kWh={kwh} | reading {count}/{WARMUP_READINGS}")
        else:
            print(f"   NORMAL  | Meter={meter_id} | kWh={kwh} | freq={freq:.6f}")

    return flask.jsonify(result)


# ── Entry point ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("⚡ GridMind Edge-AI starting on http://0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
