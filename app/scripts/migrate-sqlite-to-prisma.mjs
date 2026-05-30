#!/usr/bin/env node
/**
 * One-time migration: copy data from local SQLite (app/data/chambellan.db)
 * into PostgreSQL via Prisma. Safe to re-run — skips when Postgres already has clients.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/migrate-sqlite-to-prisma.mjs
 */
import Database from "better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "chambellan.db");

const directUrl =
  process.env.POSTGRES_URL ??
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL;

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
  }),
});

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const existing = await prisma.client.count();
  if (existing > 0) {
    console.log(`Postgres already has ${existing} client(s). Skipping SQLite import.`);
    return;
  }

  if (!fs.existsSync(DB_PATH)) {
    console.log(`No SQLite file at ${DB_PATH}. Nothing to migrate.`);
    return;
  }

  const sqlite = new Database(DB_PATH, { readonly: true });
  const clients = sqlite.prepare("SELECT * FROM clients ORDER BY id ASC").all();
  const trips = sqlite.prepare("SELECT * FROM trips ORDER BY id ASC").all();
  const tripDays = sqlite.prepare("SELECT * FROM trip_days ORDER BY id ASC").all();
  const activities = sqlite.prepare("SELECT * FROM activities ORDER BY id ASC").all();

  console.log(
    `Importing ${clients.length} clients, ${trips.length} trips, ${tripDays.length} days, ${activities.length} activities…`
  );

  const clientIdMap = new Map();
  for (const row of clients) {
    const created = await prisma.client.create({
      data: {
        full_name: row.full_name ?? "",
        phone: row.phone ?? "",
        whatsapp: row.whatsapp ?? "",
        email: row.email ?? "",
        nationality: row.nationality ?? "",
        notes: row.notes ?? "",
        preferences: row.preferences ?? "",
      },
    });
    clientIdMap.set(row.id, created.id);
  }

  const tripIdMap = new Map();
  for (const row of trips) {
    const created = await prisma.trip.create({
      data: {
        client_id: row.client_id ? clientIdMap.get(row.client_id) ?? null : null,
        client_name: row.client_name ?? "",
        destination: row.destination ?? "",
        arrival_date: row.arrival_date ?? "",
        departure_date: row.departure_date ?? "",
        hotel: row.hotel ?? "",
        villa: row.villa ?? "",
        driver: row.driver ?? "",
        butler: row.butler ?? "",
        security: row.security ?? "",
        notes: row.notes ?? "",
        driver_name: row.driver_name ?? "",
        driver_phone: row.driver_phone ?? "",
        butler_name: row.butler_name ?? "",
        butler_phone: row.butler_phone ?? "",
        security_contact: row.security_contact ?? "",
        emergency_contact: row.emergency_contact ?? "",
        yacht: row.yacht ?? "",
        jet: row.jet ?? "",
        restaurant_reservations: row.restaurant_reservations ?? "",
        club_reservations: row.club_reservations ?? "",
      },
    });
    tripIdMap.set(row.id, created.id);
  }

  const dayIdMap = new Map();
  for (const row of tripDays) {
    const tripId = tripIdMap.get(row.trip_id);
    if (!tripId) continue;
    const created = await prisma.tripDay.create({
      data: {
        trip_id: tripId,
        date: row.date,
        sections: row.sections ?? "[]",
      },
    });
    dayIdMap.set(row.id, created.id);
  }

  for (const row of activities) {
    const dayId = dayIdMap.get(row.trip_day_id);
    if (!dayId) continue;
    await prisma.activity.create({
      data: {
        trip_day_id: dayId,
        period: row.period ?? "",
        activity_type: row.activity_type ?? "activity",
        time: row.time ?? "",
        title: row.title ?? "",
        details: row.details ?? "",
        status: row.status ?? "confirmed",
        sort_order: row.sort_order ?? 0,
      },
    });
  }

  sqlite.close();
  console.log("SQLite → Postgres migration complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
