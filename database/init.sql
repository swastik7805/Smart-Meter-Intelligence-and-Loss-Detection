-- GridMind — Database Schema
-- Runs automatically when the PostgreSQL container starts for the first time.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS anomalies (
    id          SERIAL PRIMARY KEY,
    meter_id    VARCHAR(50)  NOT NULL,
    kwh         FLOAT        NOT NULL,
    severity    VARCHAR(10)  NOT NULL,
    probability FLOAT        NOT NULL,
    location    GEOMETRY(Point, 4326),
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Indexes for fast dashboard queries
CREATE INDEX idx_anomalies_created_at ON anomalies(created_at DESC);
CREATE INDEX idx_anomalies_meter_id   ON anomalies(meter_id);
