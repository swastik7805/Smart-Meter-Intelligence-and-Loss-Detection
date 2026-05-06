## Docker postgis setup 

## Docker commands used

`docker run -d --name gridmind-db -e POSTGRES_DB=gridmind -e POSTGRES_USER=gridmind -e POSTGRES_PASSWORD=gridmind123 -p 5432:5432 -v pgdata:/var/lib/postgresql/data postgis/postgis:latest`

Image to be used : postgis/postgis:latest

## Sanity Checks:

`docker exec -it gridmind-db psql -U gridmind -d gridmind`

Need to run the following sql queries to create the schema:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS anomalies (
    id          SERIAL PRIMARY KEY,
    meter_id    VARCHAR(50)  NOT NULL,
    kwh         DOUBLE PRECISION NOT NULL,
    severity    VARCHAR(10)  NOT NULL,
    probability DOUBLE PRECISION NOT NULL,
    location    GEOMETRY(Point, 4326),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_created_at ON anomalies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_meter_id ON anomalies(meter_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_location ON anomalies USING GIST(location);
```