/**
 * GridMind — PostgreSQL connection pool for the Next.js API layer.
 */

import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433"),
  database: process.env.DB_NAME || "gridmind",
  user: process.env.DB_USER || "gridmind",
  password: process.env.DB_PASS || "gridmind123",
  max: 5,
});

export default pool;
