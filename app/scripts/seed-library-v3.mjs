#!/usr/bin/env node
/**
 * Seed canonical events and event venues for Chambellan v3.
 * Run: node scripts/seed-library-v3.mjs (from app/)
 */
import "dotenv/config";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

const EVENTS = [
  {
    name: "Monaco Grand Prix",
    destination: "Monaco",
    category: "grand_prix",
    notes: "Formula 1 Monaco Grand Prix",
  },
  {
    name: "Cannes Film Festival",
    destination: "Cannes",
    category: "festival",
    notes: "Festival de Cannes",
  },
  {
    name: "Yacht Show Monaco",
    destination: "Monaco",
    category: "yacht_event",
  },
  {
    name: "Formula 1 Paddock Club",
    destination: "Monaco",
    category: "hospitality",
  },
  {
    name: "White Party Saint-Tropez",
    destination: "Saint-Tropez",
    category: "night_event",
  },
  {
    name: "Art Basel Miami",
    destination: "Other",
    category: "festival",
  },
  {
    name: "Formula E Monaco",
    destination: "Monaco",
    category: "grand_prix",
  },
];

const VENUES = [
  { name: "House 44", destination: "Monaco", event: "Monaco Grand Prix" },
  { name: "Amber Lounge", destination: "Monaco", event: "Monaco Grand Prix" },
  { name: "Turbo Monaco", destination: "Monaco", event: "Monaco Grand Prix" },
  { name: "Paddock Club", destination: "Monaco", event: "Formula 1 Paddock Club" },
  { name: "Cloud 9", destination: "Ibiza", event: null },
];

async function upsertEvent(event) {
  const existing = await client.query(
    `SELECT id FROM concierge_events WHERE lower(name) = lower($1) AND lower(destination) = lower($2)`,
    [event.name, event.destination]
  );
  if (existing.rows.length) return existing.rows[0].id;

  const inserted = await client.query(
    `INSERT INTO concierge_events (name, destination, category, notes, start_date, end_date, contact_name, phone, whatsapp, email, website, internal_notes, is_favorite, created_at, updated_at)
     VALUES ($1, $2, $3, $4, '', '', '', '', '', '', '', '', false, NOW(), NOW())
     RETURNING id`,
    [event.name, event.destination, event.category, event.notes ?? ""]
  );
  return inserted.rows[0].id;
}

async function upsertVenue(venue, eventId) {
  const existing = await client.query(
    `SELECT id FROM event_venues WHERE lower(name) = lower($1) AND lower(destination) = lower($2)`,
    [venue.name, venue.destination]
  );
  if (existing.rows.length) return;

  await client.query(
    `INSERT INTO event_venues (name, destination, event_id, contact_name, phone, whatsapp, email, website, notes, internal_notes, is_favorite, created_at, updated_at)
     VALUES ($1, $2, $3, '', '', '', '', '', '', '', false, NOW(), NOW())`,
    [venue.name, venue.destination, eventId]
  );
}

async function main() {
  await client.connect();
  const eventIds = new Map();

  for (const event of EVENTS) {
    const id = await upsertEvent(event);
    eventIds.set(event.name, id);
    console.log(`Event: ${event.name}`);
  }

  for (const venue of VENUES) {
    const eventId = venue.event ? eventIds.get(venue.event) ?? null : null;
    await upsertVenue(venue, eventId);
    console.log(`Venue: ${venue.name}`);
  }

  await client.end();
  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
