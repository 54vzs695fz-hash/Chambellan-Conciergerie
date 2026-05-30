import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "chambellan-data")
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "chambellan.db");

let db: Database.Database | null = null;

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      nationality TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      preferences TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trip_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      UNIQUE(trip_id, date)
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_day_id INTEGER NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
      period TEXT NOT NULL CHECK(period IN ('morning', 'afternoon', 'evening')),
      activity_type TEXT NOT NULL DEFAULT 'activity',
      time TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_trips_client ON trips(client_id);
    CREATE INDEX IF NOT EXISTS idx_trip_days_trip ON trip_days(trip_id);
    CREATE INDEX IF NOT EXISTS idx_activities_day ON activities(trip_day_id);
  `);

  migrateActivitiesPeriod(database);
  migrateConciergeTeamColumns(database);
  migratePlannerColumns(database);
}

const PLANNER_TRIP_COLUMNS = [
  "yacht",
  "jet",
  "restaurant_reservations",
  "club_reservations",
] as const;

function migratePlannerColumns(database: Database.Database) {
  const tripCols = database
    .prepare("PRAGMA table_info(trips)")
    .all() as { name: string }[];
  const tripExisting = new Set(tripCols.map((c) => c.name));
  for (const col of PLANNER_TRIP_COLUMNS) {
    if (!tripExisting.has(col)) {
      database.exec(
        `ALTER TABLE trips ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`
      );
    }
  }

  const dayCols = database
    .prepare("PRAGMA table_info(trip_days)")
    .all() as { name: string }[];
  const dayExisting = new Set(dayCols.map((c) => c.name));
  if (!dayExisting.has("sections")) {
    database.exec(
      `ALTER TABLE trip_days ADD COLUMN sections TEXT NOT NULL DEFAULT '[]'`
    );
  }

  migrateActivitiesFreePeriod(database);
}

function migrateActivitiesFreePeriod(database: Database.Database) {
  const row = database
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='activities'"
    )
    .get() as { sql: string } | undefined;
  if (!row?.sql || !row.sql.includes("CHECK(period IN")) return;

  database.exec(`
    CREATE TABLE activities_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_day_id INTEGER NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      activity_type TEXT NOT NULL DEFAULT 'activity',
      time TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO activities_new
      SELECT id, trip_day_id, period, activity_type, time, title, details, status, sort_order
      FROM activities;
    DROP TABLE activities;
    ALTER TABLE activities_new RENAME TO activities;
    CREATE INDEX IF NOT EXISTS idx_activities_day ON activities(trip_day_id);
  `);
}

const CONCIERGE_COLUMNS = [
  "driver_name",
  "driver_phone",
  "butler_name",
  "butler_phone",
  "security_contact",
  "emergency_contact",
] as const;

function migrateConciergeTeamColumns(database: Database.Database) {
  const cols = database
    .prepare("PRAGMA table_info(trips)")
    .all() as { name: string }[];
  const existing = new Set(cols.map((c) => c.name));

  for (const col of CONCIERGE_COLUMNS) {
    if (!existing.has(col)) {
      database.exec(
        `ALTER TABLE trips ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`
      );
    }
  }

  database.exec(`
    UPDATE trips SET driver_name = driver
    WHERE (driver_name IS NULL OR driver_name = '') AND driver != '';
    UPDATE trips SET butler_name = butler
    WHERE (butler_name IS NULL OR butler_name = '') AND butler != '';
    UPDATE trips SET security_contact = security
    WHERE (security_contact IS NULL OR security_contact = '') AND security != '';
  `);
}

/** Allow morning / afternoon / evening periods on existing databases */
function migrateActivitiesPeriod(database: Database.Database) {
  const row = database
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='activities'"
    )
    .get() as { sql: string } | undefined;

  if (!row?.sql || !row.sql.includes("CHECK(period IN")) {
    database.exec(`DROP TABLE IF EXISTS activities_new;`);
    return;
  }

  database.exec(`DROP TABLE IF EXISTS activities_new;`);
  database.exec(`
    CREATE TABLE activities_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_day_id INTEGER NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
      period TEXT NOT NULL CHECK(period IN ('morning', 'afternoon', 'evening')),
      activity_type TEXT NOT NULL DEFAULT 'activity',
      time TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO activities_new
      SELECT id, trip_day_id, period, activity_type, time, title, details, status, sort_order
      FROM activities;
    DROP TABLE activities;
    ALTER TABLE activities_new RENAME TO activities;
    CREATE INDEX IF NOT EXISTS idx_activities_day ON activities(trip_day_id);
  `);
}

export function getDb(): Database.Database {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}
