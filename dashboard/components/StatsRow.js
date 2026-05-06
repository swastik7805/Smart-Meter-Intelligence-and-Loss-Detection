import { formatTime } from "../lib/formatters";

export default function StatsRow({
  totalAlerts,
  uniqueMeters,
  latestTime,
  lastUpdated,
}) {
  return (
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
          {formatTime(lastUpdated)}
        </div>
      </div>
    </div>
  );
}
