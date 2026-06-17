#!/usr/bin/env node
/**
 * Verify recent planner grouping on Home dashboard.
 * Run: npx tsx scripts/test-recent-planners.mjs (from app/)
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

function makeTrip(id, arrival, departure) {
  return {
    id,
    destination: `Trip ${id}`,
    client_name: "Client",
    arrival_date: arrival,
    departure_date: departure,
    follow_up_status: "follow_up",
    payment_status: "pending",
    total_amount: "",
    amount_received: "",
  };
}

async function main() {
  const {
    classifyRecentPlannerPhase,
    groupRecentPlanners,
  } = await loadModule("src/lib/dashboard/recent-planners.ts");

  const today = "2026-06-15";

  assert(
    classifyRecentPlannerPhase(
      makeTrip(1, "2026-06-10", "2026-06-20"),
      today
    ) === "in_stay",
    "Should classify in-stay"
  );

  assert(
    classifyRecentPlannerPhase(
      makeTrip(2, "2026-06-20", "2026-06-25"),
      today
    ) === "upcoming",
    "Should classify upcoming"
  );

  assert(
    classifyRecentPlannerPhase(
      makeTrip(3, "2026-05-01", "2026-06-01"),
      today
    ) === "past",
    "Should classify past"
  );

  const groups = groupRecentPlanners(
    [
      makeTrip(1, "2026-06-20", "2026-06-25"),
      makeTrip(2, "2026-05-01", "2026-06-01"),
      makeTrip(3, "2026-06-10", "2026-06-20"),
      makeTrip(4, "2026-07-01", "2026-07-08"),
    ],
    new Date(`${today}T12:00:00`)
  );

  assert(groups.inStay.length === 1 && groups.inStay[0].id === 3, "One in stay");
  assert(
    groups.upcoming.map((trip) => trip.id).join(",") === "1,4",
    "Upcoming sorted nearest first"
  );
  assert(groups.past.length === 1 && groups.past[0].id === 2, "One past trip");

  console.log("test-recent-planners: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
