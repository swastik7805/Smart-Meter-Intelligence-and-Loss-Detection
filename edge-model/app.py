"""
GridMind — Edge-AI Anomaly Detector.

Ultra-lightweight Welford's Online Z-Score anomaly detection model.
Designed to run on edge devices (e.g., inside a smart meter).
Learns each meter's baseline (mean + std dev) in real-time via
online learning and flags sudden consumption drops/spikes as anomalies
using the 3-sigma rule.
"""

import os
import math
import flask
from flask_cors import CORS
from db import insert_anomaly, clear_anomalies

app = flask.Flask(__name__)
CORS(app) 
SERVER_URL = os.getenv("API_URL", "http://localhost:5000/predict")
BASE_URL = "/".join(SERVER_URL.split("/")[:-1])

# Online-learning state (per meter) 
# Welford's online algorithm state: {meter_id: {"count": n, "mean": μ, "m2": M2}}
meter_stats = {}
latest_readings = {}

#  Known meters (for /status zero-fill before data arrives) 
KNOWN_METERS = ["BLR-M001", "BLR-M002", "BLR-M003", "BLR-M004", "BLR-M005"]

#  Tuning knobs        
Z_THRESHOLD = 3.0         # flag if |reading - mean| > Z * std_dev (3-sigma rule)
WARMUP_READINGS = 20      # don't flag until we've seen at least N readings
MIN_STD_DEV = 0.1         # floor to avoid div-by-zero on perfectly stable meters


def welford_update(stats, new_value):
    """
    Welford's online algorithm for computing running mean and variance.
    Updates in O(1) time and O(1) memory per meter.
    """
    stats["count"] += 1
    n = stats["count"]
    delta = new_value - stats["mean"]
    stats["mean"] += delta / n
    delta2 = new_value - stats["mean"]
    stats["m2"] += delta * delta2

    # Compute current standard deviation
    if n < 2:
        std_dev = 0.0
    else:
        variance = stats["m2"] / (n - 1)  # Bessel's correction
        std_dev = math.sqrt(variance)

    return stats, std_dev


@app.route("/health", methods=["GET"])
def health():
    """Simple health-check endpoint."""
    return flask.jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    """Receive a single smart-meter reading and classify it."""
    content = flask.request.json
    if not content:
        return flask.jsonify({"error": "Empty request body"}), 400

    meter_id = content.get("Meter_ID", "UNKNOWN")
    kwh = content.get("kWh")
    lat = content.get("lat", 0.0)
    lon = content.get("lon", 0.0)

    if kwh is None:
        return flask.jsonify({"error": "Missing kWh field"}), 400

    #  Initialize meter state if first reading 
    if meter_id not in meter_stats:
        meter_stats[meter_id] = {"count": 0, "mean": 0.0, "m2": 0.0}

    #  Compute Z-score BEFORE updating (test against learned baseline)
    stats = meter_stats[meter_id]
    count = stats["count"]

    if count >= WARMUP_READINGS:
        std_dev = math.sqrt(stats["m2"] / (count - 1)) if count > 1 else 0.0
        effective_std = max(std_dev, MIN_STD_DEV)
        z_score = abs(kwh - stats["mean"]) / effective_std
    else:
        z_score = 0.0  # don't compute during warmup

    #  Online learning: update running mean/std with Welford's 
    stats, current_std = welford_update(stats, kwh)
    meter_stats[meter_id] = stats

    #  Store latest reading for /status endpoint 
    latest_readings[meter_id] = {
        "kwh": kwh,
        "count": stats["count"],
        "mean": round(stats["mean"], 4),
        "std_dev": round(current_std, 4),
        "z_score": round(z_score, 2),
        "is_warming_up": stats["count"] < WARMUP_READINGS,
        "is_anomaly": False,
        "severity": "NONE"
    }

    #  Default: non-anomalous 
    result = {
        "Meter_ID": meter_id,
        "kWh": kwh,
        "label": "normal",
        "severity": "NONE",
        "is_anomaly": False,
    }

    #  Anomaly detection (only after warm-up) 
    if stats["count"] > WARMUP_READINGS and z_score >= Z_THRESHOLD:
        
        # Calculate variable severity & confidence based on Z-Score
        anomaly_prob = min(0.99, 1.0 - (3.0 / z_score))  # normalize Z to 0-1 probability
        
        if z_score >= 10.0:
            severity = "CRITICAL"
        elif z_score >= 5.0:
            severity = "HIGH"
        else:
            severity = "MEDIUM"

        result.update({
            "prob": round(anomaly_prob, 6),
            "label": "anomaly",
            "severity": severity,
            "is_anomaly": True,
        })
        latest_readings[meter_id]["is_anomaly"] = True
        latest_readings[meter_id]["severity"] = severity
        
        # Push to PostgreSQL immediately
        try:
            insert_anomaly(meter_id, kwh, lat, lon, severity, round(anomaly_prob, 6))
            result["db_status"] = "pushed"
        except Exception as e:
            print(f"[DB ERROR] {e}")
            result["db_status"] = "failed"

        print(f"🚨 ANOMALY | Meter={meter_id} | kWh={kwh:>7.2f} | Z={z_score:.2f} | severity={severity}")
    else:
        if stats["count"] <= WARMUP_READINGS:
            print(f"   WARMUP  | Meter={meter_id} | kWh={kwh:>7.2f} | reading {stats['count']}/{WARMUP_READINGS}")
        else:
            print(f"   NORMAL  | Meter={meter_id} | kWh={kwh:>7.2f} | Z={z_score:.2f}")

    return flask.jsonify(result)

@app.route("/status", methods=["GET"])
def status():
    """
    Returns live readings for all known meters.
    Before any reading arrives, meters show kwh=0.0 and is_warming_up=True.
    """
    output = []
    for mid in KNOWN_METERS:
        if mid in latest_readings:
            r = latest_readings[mid]
            count = r["count"]
            output.append({
                "meter_id": mid,
                "kwh": r["kwh"],
                "count": count,
                "mean": r["mean"],
                "std_dev": r["std_dev"],
                "z_score": r["z_score"],
                "is_warming_up": r["is_warming_up"],
                "warmup_progress": min(100, int(count / WARMUP_READINGS * 100)),
                "is_anomaly": r.get("is_anomaly", False),
                "severity": r.get("severity", "NONE")
            })
        else:
            output.append({
                "meter_id": mid,
                "kwh": 0.0,
                "count": 0,
                "mean": 0.0,
                "std_dev": 0.0,
                "z_score": 0.0,
                "is_warming_up": True,
                "warmup_progress": 0,
                "is_anomaly": False,
                "severity": "NONE"
            })
    return flask.jsonify(output)

@app.route("/reset", methods=["POST"])
def reset():
    """
    Clear all anomaly logs from DB and reset in-memory meter state.
    Called by the frontend on each fresh browser session so that
    judges always see a clean warm-up, not stale historical data.
    """
    global meter_stats, latest_readings
    meter_stats = {}
    latest_readings = {}
    try:
        clear_anomalies()
        print("🔄 RESET | DB cleared + in-memory state wiped for fresh demo session")
        return flask.jsonify({"status": "reset_complete"})
    except Exception as e:
        print(f"[RESET ERROR] DB clear failed: {e}")
        return flask.jsonify({"status": "partial_reset", "error": str(e)}), 500


#  Entry point 
if __name__ == "__main__":
    print(f" GridMind Edge-AI (Welford Z-Score) starting on {BASE_URL}")
    app.run(host="0.0.0.0", port=5000, debug=False)