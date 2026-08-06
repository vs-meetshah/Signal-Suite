import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const useSsl = (process.env.PGSSL ?? "true").toLowerCase() !== "false";
const rejectUnauthorized =
  (process.env.PGSSL_REJECT_UNAUTHORIZED ?? "false").toLowerCase() === "true";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized } : false,
});

export const db = drizzle(pool, { schema });
