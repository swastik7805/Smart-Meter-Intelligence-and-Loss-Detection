import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL_MS = 2000;
const EDGE_MODEL_URL = "http://localhost:5000";

const INITIAL_METERS = [
  { meter_id: "BLR-M001", kwh: 0.0, is_warming_up: true, warmup_progress: 0, severity: "NONE", is_anomaly: false },
  { meter_id: "BLR-M002", kwh: 0.0, is_warming_up: true, warmup_progress: 0, severity: "NONE", is_anomaly: false },
  { meter_id: "BLR-M003", kwh: 0.0, is_warming_up: true, warmup_progress: 0, severity: "NONE", is_anomaly: false },
  { meter_id: "BLR-M004", kwh: 0.0, is_warming_up: true, warmup_progress: 0, severity: "NONE", is_anomaly: false },
  { meter_id: "BLR-M005", kwh: 0.0, is_warming_up: true, warmup_progress: 0, severity: "NONE", is_anomaly: false },
];

export function useDashboardData() {
  const [anomalies, setAnomalies] = useState([]);
  const [liveMeters, setLiveMeters] = useState(INITIAL_METERS);
  const [error, setError] = useState(null);
  const [edgeOnline, setEdgeOnline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnomalies = useCallback(async () => {
    try {
      const res = await fetch("/api/anomalies");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAnomalies(data);
        setError(null);
      }
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchLiveStatus = useCallback(async () => {
    try {
      const res = await fetch(`${EDGE_MODEL_URL}/status`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLiveMeters(data);
        setEdgeOnline(true);
      }
    } catch {
      setEdgeOnline(false);
      // Keep existing data but mark as offline implicitly by not updating
    }
  }, []);

  const clearHistory = async () => {
    try {
      await fetch("/api/anomalies/clear", { method: "DELETE" });
      setAnomalies([]);
    } catch (err) {
      console.error("Failed to clear history", err);
    }
  };

  useEffect(() => {
    fetchAnomalies();
    fetchLiveStatus();
    const id1 = setInterval(fetchAnomalies, POLL_INTERVAL_MS);
    const id2 = setInterval(fetchLiveStatus, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id1);
      clearInterval(id2);
    };
  }, [fetchAnomalies, fetchLiveStatus]);

  return {
    anomalies,
    liveMeters,
    error,
    edgeOnline,
    lastUpdated,
    clearHistory
  };
}
