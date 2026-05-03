-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Table
CREATE TABLE IF NOT EXISTS anomalies (
    id          SERIAL PRIMARY KEY,
    meter_id    VARCHAR(50)  NOT NULL,
    kwh         DOUBLE PRECISION NOT NULL,
    severity    VARCHAR(10)  NOT NULL,
    probability DOUBLE PRECISION NOT NULL,
    location    GEOMETRY(Point, 4326),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_anomalies_created_at 
ON anomalies(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_anomalies_meter_id   
ON anomalies(meter_id);

-- Spatial index 
CREATE INDEX IF NOT EXISTS idx_anomalies_location 
ON anomalies USING GIST(location);