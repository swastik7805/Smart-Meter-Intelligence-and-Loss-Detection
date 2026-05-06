import { formatDate, formatkWh } from "../lib/formatters";

export default function AnomalyTable({ anomalies, edgeOnline, liveMeters, onClearHistory }) {
  const totalAlerts = anomalies.length;

  return (
    <div className="table-container" id="anomaly-table" style={{ marginTop: "20px" }}>
      <div className="table-header">
        <h2>Anomaly Log</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className="count-badge">{totalAlerts} records</span>
        </div>
      </div>

      {totalAlerts === 0 ? (
        <div className="empty-state">
          <div className="icon">📡</div>
          <p>
            {edgeOnline
              ? liveMeters.some((m) => m.is_warming_up)
                ? "Warming up — detection starts after 20 readings per meter."
                : "No anomalies detected — all meters normal."
              : "Start the edge model & simulator to begin monitoring."}
          </p>
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
              {anomalies.map((a) => {
                const sevClass = a.severity ? a.severity.toLowerCase() : "medium";

                // Prob bar color by severity
                const barColor =
                  sevClass === "critical"
                    ? "var(--sev-crit-text)"
                    : sevClass === "high"
                    ? "var(--accent)"
                    : "var(--sev-med-text)";

                return (
                  <tr key={a.id} className={`severity-${sevClass}`}>
                    <td>
                      <span className="timestamp">{formatDate(a.created_at)}</span>
                    </td>
                    <td>
                      <span className="meter-chip">{a.meter_id}</span>
                    </td>
                    <td>
                      <span className="kwh-value">{formatkWh(a.kwh)}</span>
                    </td>
                    <td>
                      <span className={`severity-badge ${sevClass}`}>
                        <span className="dot" />
                        {a.severity || "MEDIUM"}
                      </span>
                    </td>
                    <td>
                      <div className="prob-bar-container">
                        <div className="prob-bar">
                          <div
                            className="prob-bar-fill"
                            style={{
                              width: `${(a.probability * 100).toFixed(0)}%`,
                              background: barColor,
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}