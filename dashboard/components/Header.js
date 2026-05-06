export default function Header({ edgeOnline }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div>
          <h1>GridMind</h1>
          <span className="subtitle">Edge-AI Theft Detection</span>
        </div>
      </div>
      <div className="header-status">
        <div className={`edge-badge ${edgeOnline ? "online" : "offline"}`}>
          <span className="edge-dot" />
          Edge: {edgeOnline ? "Online" : "Offline"}
        </div>
        <div className="live-badge">
          <span className="live-dot" />
          Live
        </div>
      </div>
    </header>
  );
}