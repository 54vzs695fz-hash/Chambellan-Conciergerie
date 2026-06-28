#!/usr/bin/env node
/**
 * Verify mobile home today action grouping.
 * Run: npx tsx scripts/test-home-today.mjs (from app/)
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function loadModule(relativePath) {
  return import(pathToFileURL(join(root, relativePath)).href);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const { buildTodayActionGroups, countTodayActions } = await loadModule(
  "src/lib/dashboard/home-today.ts"
);

const today = new Date("2026-06-15T12:00:00.000Z");

const groups = buildTodayActionGroups(
  [
    {
      id: 1,
      client_name: "Alice",
      destination: "Saint-Tropez",
      arrival_date: "2026-06-15",
      departure_date: "2026-06-20",
      follow_up_status: "confirmed",
    },
    {
      id: 2,
      client_name: "Bob",
      destination: "Monaco",
      arrival_date: "2026-06-01",
      departure_date: "2026-06-15",
      follow_up_status: "confirmed",
      payment_status: "pending",
    },
  ],
  [
    {
      id: 1,
      client_name: "Alice",
      destination: "Saint-Tropez",
      arrival_date: "2026-06-15",
      departure_date: "2026-06-20",
      follow_up_status: "confirmed",
      days: [
        {
          id: 10,
          trip_id: 1,
          date: "2026-06-15",
          sections: [],
          destination_override: "",
          activities: [
            {
              id: 100,
              trip_day_id: 10,
              period: "evening",
              activity_type: "restaurant",
              time: "20:00",
              title: "Verde Beach",
              details: "",
              status: "confirmed",
              booking_status: "to_request",
              assigned_to: "",
              booking_notes: "",
              sort_order: 0,
              establishment_city: "",
              beach_sunbeds: false,
              beach_sunbeds_time: "",
              beach_lunch: false,
              beach_lunch_time: "",
              beach_sunbeds_status: "to_request",
              beach_lunch_status: "to_request",
              transport_type: "",
              transport_pickup: "",
              transport_destination: "",
            },
          ],
        },
      ],
    },
  ],
  today
);

assert(countTodayActions(groups) >= 2, "today actions found");
assert(
  groups.some((group) => group.kind === "arrival" && group.items.length === 1),
  "arrival today"
);
assert(
  groups.some((group) => group.kind === "departure" && group.items.length === 1),
  "departure today"
);
assert(
  groups.some(
    (group) => group.kind === "booking_request" && group.items.length === 1
  ),
  "booking request today"
);

console.log("test-home-today: ok");
