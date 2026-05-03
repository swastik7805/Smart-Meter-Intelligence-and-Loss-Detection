# GridMind: Strip-Down & Rebuild Implementation Plan

## Background

The project aims to develop an edge-AI based anomaly detection system for smart meters to identify power theft in real-time. The system will use Monte Carlo frequency analysis for anomaly detection and PostgreSQL with PostGIS for spatial data storage and retrieval. The frontend will be a Next.js dashboard for visualization.

```
aiForBharat/
├── edge-model/          # Python: Monte Carlo anomaly detector + DB push
│   ├── app.py           # Flask API — the edge-AI brain
│   ├── simulator.py     # Simulates streaming kWh data for demo
│   ├── db.py            # PostgreSQL+PostGIS connection helper
│   ├── requirements.txt # Minimal: flask, psycopg2-binary, python-dotenv
│   └── .env.example     # DB connection template
├── database/
│   └── init.sql          # Schema: anomalies table with PostGIS geometry
├── dashboard/            # Next.js frontend
│   ├── ... (scaffolded via create-next-app)
└── docker-compose.yml    # Spins up PostgreSQL+PostGIS + all services
```

---

## User Review Required

> [!IMPORTANT]
> **PostgreSQL Setup**: The plan uses Docker Compose to spin up a `postgis/postgis` container. This avoids you needing to install PostgreSQL locally. If you'd prefer a local install or a cloud-hosted DB instead, let me know.

> [!IMPORTANT]
> **Next.js Version**: I'll scaffold the dashboard with Next.js 14 (App Router) using `npx create-next-app@latest`. Confirm if this is acceptable or if you have a version preference.

## Open Questions

1. **Meter coordinates**: For PostGIS spatial data, should I use hardcoded demo coordinates (e.g., Bangalore area) for the simulated meters, or do you want a configurable list?
2. **Dashboard polling interval**: How frequently should the Next.js dashboard poll for new anomalies? Default plan: every 3 seconds via client-side fetch.
3. **Number of simulated meters**: Should the simulator generate data for 1 meter or multiple meters (e.g., 5 meters across different locations)?

---

## Proposed Changes

### Component 1: Edge Model (Python)

The core Monte Carlo frequency model from the original `app.py` is preserved but significantly improved: proper per-meter tracking, persistent count, PostgreSQL push on anomaly, and a simulator script for live demos.

#### [NEW] [app.py]
- **Flask API** with a single `/predict` POST endpoint
- Receives JSON: `{ "Meter_ID": "M001", "kWh": 5.2, "lat": 12.97, "lon": 77.59 }`
- Maintains a **per-meter** frequency dictionary (`defaultdict` of `defaultdict`)
- Maintains a **per-meter** total count (fixes the original bug where `count` was a local variable always reset to 0)
- If the frequency of the incoming kWh value is below `alert_threshold` (0.005) AND the meter has seen enough readings (warm-up period of 20 readings), flags as anomaly
- On anomaly detection → calls `db.insert_anomaly()` to push to PostgreSQL
- Returns JSON response with `label`, `severity`, `prob`, `Meter_ID`

#### [NEW] [db.py]
- Uses `psycopg2` to connect to PostgreSQL
- `insert_anomaly(meter_id, kwh, lat, lon, severity, prob)` → inserts into `anomalies` table with PostGIS `ST_MakePoint(lon, lat)` for the geometry column
- Connection params loaded from environment variables via `python-dotenv`

#### [NEW] [simulator.py]
- Simulates N meters sending kWh readings to the Flask `/predict` endpoint
- Normal readings: random values drawn from a normal distribution centered around each meter's baseline (e.g., 4.5–5.5 kWh)
- Anomalous readings: injected every ~20 readings with extreme values (e.g., 0.1 kWh for theft/tampering, or 99.9 kWh for spike)
- Sends POST requests to `http://localhost:5000/predict` with `Meter_ID`, `kWh`, `lat`, `lon`
- Prints results to console in real-time

#### [NEW] [requirements.txt]
```
flask
psycopg2-binary
python-dotenv
requests
```
Only 4 dependencies. No TensorFlow, no Keras, no scikit-learn, no pandas, no numpy.

#### [NEW] [.env.example]
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gridmind
DB_USER=gridmind
DB_PASS=gridmind123
```

---

### Component 2: Database (PostgreSQL + PostGIS)

#### [NEW] [init.sql]
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS anomalies (
    id          SERIAL PRIMARY KEY,
    meter_id    VARCHAR(50) NOT NULL,
    kwh         FLOAT NOT NULL,
    severity    VARCHAR(10) NOT NULL,
    probability FLOAT NOT NULL,
    location    GEOMETRY(Point, 4326),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomalies_created_at ON anomalies(created_at DESC);
CREATE INDEX idx_anomalies_meter_id ON anomalies(meter_id);
```

---

### Component 3: Dashboard (Next.js)

#### [NEW] dashboard/ (scaffolded via `npx create-next-app@latest`)
- Uses Next.js App Router
- Single page: `/` — the operator dashboard

#### [NEW] [page.js]
- Client component that polls `/api/anomalies` every 3 seconds
- Renders a styled, live-updating table:
  - Columns: **Time**, **Meter ID**, **kWh**, **Severity**, **Coordinates**
  - Rows sorted by most recent first
  - HIGH severity rows highlighted in red
- Header with "GridMind" branding and a live status indicator
- Dark theme, modern glassmorphism aesthetic

#### [NEW] [route.js]
- Next.js API route that connects to PostgreSQL
- `GET /api/anomalies` → queries last 100 anomalies ordered by `created_at DESC`
- Returns JSON array with `id`, `meter_id`, `kwh`, `severity`, `probability`, `lat`, `lon`, `created_at`
- Uses the `pg` npm package for database connection

#### [NEW] [globals.css]
- Dark mode color scheme
- Glassmorphism card effects
- Pulsing live indicator animation
- Smooth row entrance animations
- Modern typography (Inter from Google Fonts — already default in Next.js)

#### [NEW] [layout.js]
- Root layout with proper SEO meta tags (title: "GridMind Dashboard", description)
- Dark background applied globally

---

### Component 4: Orchestration

#### [NEW] [docker-compose.yml]
```yaml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: gridmind
      POSTGRES_USER: gridmind
      POSTGRES_PASSWORD: gridmind123
    ports:
      - "5432:5432"
    volumes:
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

> [!NOTE]
> The edge-model and dashboard run locally (`python app.py` and `npm run dev`) for ease of development/demo. Only PostgreSQL runs in Docker to avoid local installation headaches.

---

## Verification Plan

### Automated Tests
1. **Start PostgreSQL**: `docker compose up -d` from `aiForBharat/`
2. **Start Edge Model**: `cd edge-model && pip install -r requirements.txt && python app.py`
3. **Start Simulator**: `python simulator.py` (in a separate terminal) — verify anomalies are detected and logged
4. **Start Dashboard**: `cd dashboard && npm install && npm run dev`
5. **Browser Test**: Open `http://localhost:3000` and verify anomaly rows appear live in the table as the simulator runs

### Manual Verification
- Confirm the simulator output shows "ANOMALY DETECTED" for injected extreme values
- Confirm the PostgreSQL `anomalies` table has rows: `docker exec -it <container> psql -U gridmind -d gridmind -c "SELECT * FROM anomalies;"`
- Confirm the Next.js dashboard updates in real-time with new rows appearing every few seconds
