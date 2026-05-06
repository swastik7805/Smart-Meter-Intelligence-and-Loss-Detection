import { formatkWh } from "../lib/formatters";

export default function LiveMeterGrid({ liveMeters }) {
  return (
    <>
      <div
        className="section-title"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>Live Smart Meters</span>
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "1px",
            fontWeight: "normal",
          }}
        >
          Polling local edge model...
        </span>
      </div>

      <div className="meters-grid" id="live-meters-grid">
        {liveMeters.map((m) => {
          let cardClass = "meter-card active";
          if (m.is_warming_up) cardClass = "meter-card warming";
          else if (m.is_anomaly) cardClass = `meter-card anomaly-${m.severity.toLowerCase()}`;

          const kwhColor = m.is_anomaly
            ? "var(--sev-crit-text)"
            : m.is_warming_up
            ? "#818cf8"
            : "var(--text-primary)";

          return (
            <div key={m.meter_id} className={cardClass} id={`meter-${m.meter_id}`}>
              <div className="meter-header">
                <div className="meter-id">{m.meter_id}</div>
                {m.is_anomaly && (
                  <span
                    className={`severity-badge ${m.severity.toLowerCase()}`}
                    style={{ transform: "scale(0.85)", margin: 0 }}
                  >
                    <span className="dot" /> {m.severity}
                  </span>
                )}
              </div>

              <div className="meter-kwh" style={{ color: kwhColor }}>
                {formatkWh(m.kwh)}
                <span className="meter-unit">kWh</span>
              </div>

              <div className="meter-status">
                {m.is_warming_up ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span className="warmup-label">Learning baseline...</span>
                      <span className="warmup-pct">{m.warmup_progress}%</span>
                    </div>
                    <div className="warmup-bar">
                      <div className="warmup-fill" style={{ width: `${m.warmup_progress}%` }} />
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      className="ready-label"
                      style={{
                        color: m.is_anomaly ? "var(--sev-crit-text)" : "var(--success)",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {m.is_anomaly ? "Anomaly Detected" : "Normal"}
                    </span>
                    <span className="meter-count">{m.count} rdgs</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}