"use client";

import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL_MS = 3000;

export default function Dashboard() {
  const [anomalies, setAnomalies] = useState([]);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnomalies = useCallback(async () => {
    try {
      const res = await fetch("/api/anomalies");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnomalies(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
    const id = setInterval(fetchAnomalies, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchAnomalies]);

  // ── Derived stats ───────────────────────────────────────────────
  const totalAlerts = anomalies.length;
  const uniqueMeters = new Set(anomalies.map((a) => a.meter_id)).size;
  const latestTime =
    anomalies.length > 0
      ? new Date(anomalies[0].created_at).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : "—";

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-brand">
          <span className="logo-icon">⚡</span>
          <div>
            <h1>GridMind</h1>
            <span className="subtitle">
              Edge-AI Power Theft Detection
            </span>
          </div>
        </div>
        <div className="header-status">
          <div className="live-badge">
            <span className="live-dot" />
            Live
          </div>
        </div>
      </header>

      {/* ── Error banner ───────────────────────────────────────────── */}
      {error && (
        <div className="error-banner" id="error-banner">
          ⚠️ Connection error: {error}. Retrying every {POLL_INTERVAL_MS / 1000}s…
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────── */}
      <div className="stats-row">
        <div className="stat-card" id="stat-total-alerts">
          <div className="stat-label">Total Alerts</div>
          <div className="stat-value">{totalAlerts}</div>
        </div>
        <div className="stat-card" id="stat-unique-meters">
          <div className="stat-label">Meters Flagged</div>
          <div className="stat-value">{uniqueMeters}</div>
        </div>
        <div className="stat-card" id="stat-latest-alert">
          <div className="stat-label">Latest Alert</div>
          <div className="stat-value" style={{ fontSize: "1rem" }}>
            {latestTime}
          </div>
        </div>
        <div className="stat-card" id="stat-last-poll">
          <div className="stat-label">Last Poll</div>
          <div className="stat-value" style={{ fontSize: "1rem" }}>
            {lastUpdated
              ? lastUpdated.toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })
              : "—"}
          </div>
        </div>
      </div>

      {/* ── Anomaly table ──────────────────────────────────────────── */}
      <div className="table-container" id="anomaly-table">
        <div className="table-header">
          <h2>🚨 Anomaly Alerts</h2>
          <span className="count-badge">{totalAlerts} records</span>
        </div>

        {anomalies.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📡</div>
            <p>No anomalies detected yet. Start the edge model &amp; simulator.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Meter ID</th>
                  <th>kWh</th>
                  <th>Severity</th>
                  <th>Confidence</th>
                  <th>Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr
                    key={a.id}
                    className={
                      a.severity === "HIGH" ? "severity-high" : ""
                    }
                  >
                    <td>
                      <span className="timestamp">
                        {new Date(a.created_at).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </td>
                    <td>
                      <span className="meter-chip">{a.meter_id}</span>
                    </td>
                    <td>
                      <span className="kwh-value">
                        {Number(a.kwh).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className={`severity-badge ${a.severity.toLowerCase()}`}>
                        <span className="dot" />
                        {a.severity}
                      </span>
                    </td>
                    <td>
                      <div className="prob-bar-container">
                        <div className="prob-bar">
                          <div
                            className="prob-bar-fill"
                            style={{
                              width: `${(a.probability * 100).toFixed(0)}%`,
                            }}
                          />
                        </div>
                        <span className="prob-text">
                          {(a.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="coords">
                        {a.lat != null
                          ? `${Number(a.lat).toFixed(4)}, ${Number(a.lon).toFixed(4)}`
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
