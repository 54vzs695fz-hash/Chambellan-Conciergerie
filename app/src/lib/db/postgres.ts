import { neon } from "@neondatabase/serverless";

let sql: ReturnType<typeof neon> | null = null;
let migrated = false;

export function getPostgres() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for Postgres");
  }
  if (!sql) {
    sql = neon(url);
  }
  return sql;
}

export async function ensurePostgresMigrated(): Promise<void> {
  if (migrated) return;
  const db = getPostgres();

  await db`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      nationality TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      preferences TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      client_name TEXT NOT NULL DEFAULT '',
      destination TEXT NOT NULL DEFAULT '',
      arrival_date TEXT NOT NULL DEFAULT '',
      departure_date TEXT NOT NULL DEFAULT '',
      hotel TEXT NOT NULL DEFAULT '',
      villa TEXT NOT NULL DEFAULT '',
      driver TEXT NOT NULL DEFAULT '',
      butler TEXT NOT NULL DEFAULT '',
      security TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      driver_name TEXT NOT NULL DEFAULT '',
      driver_phone TEXT NOT NULL DEFAULT '',
      butler_name TEXT NOT NULL DEFAULT '',
      butler_phone TEXT NOT NULL DEFAULT '',
      security_contact TEXT NOT NULL DEFAULT '',
      emergency_contact TEXT NOT NULL DEFAULT '',
      yacht TEXT NOT NULL DEFAULT '',
      jet TEXT NOT NULL DEFAULT '',
      restaurant_reservations TEXT NOT NULL DEFAULT '',
      club_reservations TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS trip_days (
      id SERIAL PRIMARY KEY,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      sections TEXT NOT NULL DEFAULT '[]',
      UNIQUE(trip_id, date)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      trip_day_id INTEGER NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      activity_type TEXT NOT NULL DEFAULT 'activity',
      time TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_trips_client ON trips(client_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_trip_days_trip ON trip_days(trip_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_activities_day ON activities(trip_day_id)`;

  migrated = true;
}

/** Normalize Postgres timestamp columns to ISO strings for the app types. */
export function rowTimestamps<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row } as Record<string, unknown>;
  for (const key of ["created_at", "updated_at"]) {
    const value = next[key];
    if (value instanceof Date) {
      next[key] = value.toISOString();
    } else if (typeof value === "string" && value.includes("T")) {
      next[key] = value.replace(" ", "T");
    }
  }
  return next as T;
}

export function pgRows<T>(result: unknown): T[] {
  return result as T[];
}
