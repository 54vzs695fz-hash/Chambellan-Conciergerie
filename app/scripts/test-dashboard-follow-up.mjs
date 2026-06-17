#!/usr/bin/env node
/**
 * Verify dashboard follow-up programme cards.
 * Run: npx tsx scripts/test-dashboard-follow-up.mjs (from app/)
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
    category: "programme",
    title: "Programme confirmation",
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
    client_name: "Ricardo Ferreira",
    destination: "Monaco",
    arrival_date: "2026-06-15",
    departure_date: "2026-06-22",
    hotel: "Hotel de Paris",
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
  const { buildDashboardProgrammeFollowUpCards } = await loadModule(
    "src/lib/dashboard/programme-follow-up-cards.ts"
  );

  const today = new Date("2026-06-01T12:00:00");
  const trip = makeTrip();
  const context = { activityTypes: new Set(), transferCount: 0 };

  const cards = buildDashboardProgrammeFollowUpCards(
    [trip],
    [
      makeItem({ id: 1, status: "done", title: "Programme confirmation" }),
      makeItem({ id: 2, category: "accommodation", title: "Hotel confirmed" }),
      makeItem({ id: 3, category: "payments", title: "Deposit requested" }),
      makeItem({
        id: 4,
        category: "concierge_services",
        title: "Yacht confirmed",
      }),
    ],
    new Map([[trip.id, context]]),
    today
  );

  assert(cards.length === 1, "expected one programme card");
  const card = cards[0];
  assert(card.client_name === "Ricardo Ferreira", "client name on card");
  assert(card.destination === "Monaco", "destination on card");
  assert(card.arrival_countdown.includes("days"), "arrival countdown on card");
  assert(card.tasks_total >= 3, "progress total uses tracked tasks");
  assert(card.tasks_completed >= 1, "progress includes completed tasks");
  assert(
    card.outstanding_tasks.includes("Hotel confirmed"),
    "outstanding tasks listed on card"
  );
  assert(
    !card.outstanding_tasks.includes("Yacht confirmed"),
    "untouched yacht template excluded from outstanding tasks"
  );
  assert(card.href === "/calendar?programme=10", "card links to calendar follow-up");
  assert(
    cards.filter((entry) => entry.tripId === trip.id).length === 1,
    "dashboard must not create one card per task"
  );

  const completedCards = buildDashboardProgrammeFollowUpCards(
    [trip],
    [
      makeItem({ id: 10, status: "done" }),
      makeItem({ id: 11, category: "accommodation", title: "Hotel confirmed", status: "done" }),
      makeItem({ id: 12, category: "payments", title: "Deposit requested", status: "done" }),
    ],
    new Map([[trip.id, context]]),
    today
  );
  assert(
    completedCards[0]?.tone === "payment" || completedCards[0]?.tone === "complete",
    "completed tasks shift card tone away from urgent"
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
  try {
    items = await listDashboardFollowUpItems();
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

  const tripIds = new Set(items.map((item) => item.tripId));
  assert(
    tripIds.size === items.length,
    "dashboard must return one card per programme"
  );

  for (const item of items) {
    assert(typeof item.outstanding_tasks === "object", "card includes outstanding tasks");
    assert(typeof item.tasks_total === "number", "card includes progress total");
    assert(item.href.includes("/calendar?programme="), "card links to calendar follow-up");
  }

  console.log(
    `Database verification passed (${items.length} programme card(s)).`
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
