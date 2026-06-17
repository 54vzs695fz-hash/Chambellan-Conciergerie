#!/usr/bin/env node
/**
 * Verify dashboard follow-up excludes untouched template tasks.
 * Run: node scripts/test-dashboard-follow-up.mjs (from app/)
 */
import { readFileSync } from "node:fs";
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

function makeItem(overrides) {
  return {
    id: 1,
    trip_id: 10,
    category: "concierge_services",
    title: "Yacht confirmed",
    status: "todo",
    notes: "",
    due_date: "",
    reminder_date: "",
    sort_order: 0,
    ...overrides,
  };
}

function makeTrip(overrides) {
  return {
    id: 10,
    client_id: null,
    client_name: "Test Client",
    destination: "Monaco",
    arrival_date: "2026-06-15",
    departure_date: "2026-06-22",
    hotel: "",
    villa: "",
    driver: "",
    butler: "",
    security: "",
    notes: "",
    driver_name: "",
    driver_phone: "",
    butler_name: "",
    butler_phone: "",
    security_contact: "",
    emergency_contact: "",
    yacht: "",
    jet: "",
    restaurant_reservations: "",
    club_reservations: "",
    host_name: "",
    host_phone: "",
    host_contact: "",
    tailored_for: "",
    follow_up_status: "follow_up",
    payment_status: "pending",
    total_amount: "",
    amount_received: "",
    payment_method: "",
    payment_notes: "",
    event_booking: "",
    event_venue: "",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

async function runUnitTests() {
  const {
    isFollowUpEligibleChecklistItem,
    isPristineDefaultChecklistItem,
    buildEmptyProgrammeContext,
  } = await loadModule("src/lib/dashboard/checklist-follow-up-eligibility.ts");

  const { buildDashboardFollowUpSummary } = await loadModule(
    "src/lib/dashboard/follow-up-summary.ts"
  );

  const today = new Date("2026-06-01T12:00:00");
  const context = buildEmptyProgrammeContext();
  const trip = makeTrip();

  assert(
    isPristineDefaultChecklistItem(makeItem()),
    "untouched yacht template should be pristine"
  );
  assert(
    !isFollowUpEligibleChecklistItem(makeItem(), trip, context, today),
    "yacht template hidden when programme has no yacht"
  );

  const yachtTrip = makeTrip({ yacht: "Sunseeker 90" });
  assert(
    isFollowUpEligibleChecklistItem(makeItem(), yachtTrip, context, today),
    "yacht template shown when yacht service exists"
  );

  const engaged = makeItem({ status: "in_progress" });
  assert(
    isFollowUpEligibleChecklistItem(engaged, trip, context, today),
    "engaged custom task always eligible"
  );

  const custom = makeItem({
    category: "concierge_services",
    title: "Helicopter confirmed",
  });
  assert(
    isFollowUpEligibleChecklistItem(custom, trip, context, today),
    "custom checklist item always eligible"
  );

  const summary = buildDashboardFollowUpSummary(
    [trip],
    [
      makeItem(),
      makeItem({ id: 2, category: "programme", title: "Programme confirmation" }),
      makeItem({ id: 3, category: "payments", title: "Deposit requested" }),
    ],
    new Map([[trip.id, context]]),
    today
  );

  assert(
    !summary.some((entry) => entry.task === "Yacht confirmed"),
    "dashboard summary must not include yacht template without yacht service"
  );
  assert(
    summary.some((entry) => entry.task === "Programme confirmation"),
    "programme tasks remain visible"
  );
  assert(
    !summary.some((entry) => entry.checklistItemId === null),
    "dashboard must not include synthetic non-database cards"
  );

  console.log("Unit checks passed.");
}

async function runDatabaseVerification() {
  const envPath = join(root, ".env");
  let envContents;
  try {
    envContents = readFileSync(envPath, "utf8");
  } catch {
    console.log("Skipping database verification (.env not found).");
    return;
  }

  for (const line of envContents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }

  if (!process.env.DATABASE_URL) {
    console.log("Skipping database verification (DATABASE_URL missing).");
    return;
  }

  process.chdir(root);
  const { listDashboardFollowUpItems } = await loadModule("src/lib/db/checklist.ts");
  const { prisma } = await loadModule("src/lib/prisma.ts");

  let items;
  let trips;
  try {
    items = await listDashboardFollowUpItems();
    trips = await prisma.trip.findMany({
      select: { id: true, yacht: true, client_name: true, destination: true },
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    const message = error instanceof Error ? error.message : String(error);
    if (
      code === "ECONNREFUSED" ||
      message.includes("ECONNREFUSED") ||
      message.includes("connect")
    ) {
      console.log("Skipping database verification (database unavailable).");
      await prisma.$disconnect().catch(() => undefined);
      return;
    }
    throw error;
  }
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));

  for (const item of items) {
    assert(item.checklistItemId !== null, "follow-up item must map to checklist row");
    if (item.task.toLowerCase() === "yacht confirmed") {
      const trip = tripById.get(item.tripId);
      assert(
        trip && String(trip.yacht ?? "").trim(),
        `Yacht confirmed shown for trip without yacht: ${trip?.client_name} / ${trip?.destination}`
      );
    }
  }

  console.log(
    `Database verification passed (${items.length} dashboard follow-up item(s)).`
  );

  await prisma.$disconnect();
}

try {
  await runUnitTests();
  await runDatabaseVerification();
  console.log("All dashboard follow-up checks passed.");
} catch (error) {
  console.error(error);
  process.exit(1);
}
