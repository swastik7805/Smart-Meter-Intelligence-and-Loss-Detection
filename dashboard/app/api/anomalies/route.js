import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic"; // never cache

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        meter_id,
        kwh,
        severity,
        probability,
        ST_Y(location) AS lat,
        ST_X(location) AS lon,
        created_at
      FROM anomalies
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[API /anomalies] DB error details:", err);
    return NextResponse.json({error: "Failed to fetch anomalies" },{status: 500 });
  }
}
