"""
GridMind — PostgreSQL + PostGIS database helper.
Inserts anomaly records with spatial coordinates.
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "dbname": os.getenv("DB_NAME", "gridmind"),
    "user": os.getenv("DB_USER", "gridmind"),
    "password": os.getenv("DB_PASS", "gridmind123"),
}


def get_connection():
    """Return a new psycopg2 connection."""
    return psycopg2.connect(**DB_CONFIG)


def insert_anomaly(meter_id, kwh, lat, lon, severity, probability):
    """Push a single anomaly record into PostgreSQL with PostGIS geometry."""
    sql = """
        INSERT INTO anomalies (meter_id, kwh, severity, probability, location)
        VALUES (%s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (meter_id, kwh, severity, probability, lon, lat))
        conn.commit()
    finally:
        conn.close()
