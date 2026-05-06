"use client";

import { useDashboardData } from "../hooks/useDashboardData";
import { formatDate } from "../lib/formatters";
import Header from "../components/Header";
import StatsRow from "../components/StatsRow";
import LiveMeterGrid from "../components/LiveMeterGrid";
import AnomalyTable from "../components/AnomalyTable";

export default function Dashboard() {
  const {
    anomalies,
    liveMeters,
    error,
    edgeOnline,
    lastUpdated,
    clearHistory,
  } = useDashboardData();

  // Derived stats
  const totalAlerts = anomalies.length;
  const uniqueMeters = new Set(anomalies.map((a) => a.meter_id)).size;
  const latestTime =
    anomalies.length > 0 ? formatDate(anomalies[0].created_at) : "—";

  return (
    <div className="app">
      <Header edgeOnline={edgeOnline} />

      <div className="app-content">
        {error && (
          <div className="error-banner" id="error-banner">
            DB connection error: {error}. Anomaly history unavailable.
          </div>
        )}

        <StatsRow
          totalAlerts={totalAlerts}
          uniqueMeters={uniqueMeters}
          latestTime={latestTime}
          lastUpdated={lastUpdated}
        />

        <LiveMeterGrid liveMeters={liveMeters} />

        <AnomalyTable
          anomalies={anomalies}
          edgeOnline={edgeOnline}
          liveMeters={liveMeters}
          onClearHistory={clearHistory}
        />
      </div>
    </div>
  );
}
