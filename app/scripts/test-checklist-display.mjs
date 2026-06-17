#!/usr/bin/env node
/**
 * Verify follow-up checklist category visibility logic.
 * Run: npx tsx scripts/test-checklist-display.mjs (from app/)
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

function makeTrip(overrides = {}) {
  return {
    id: 10,
    client_id: null,
    client_name: "Client",
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

async function run() {
  const {
    getVisibleChecklistCategories,
    getAddableChecklistCategories,
    getVisibleChecklistItems,
  } = await loadModule("src/lib/planner/checklist-display.ts");

  const today = new Date("2026-06-01T12:00:00");
  const trip = makeTrip();
  const context = {
    activityTypes: new Set(["restaurant", "beach_club", "club"]),
    transferCount: 0,
  };

  const items = [
    makeItem({ id: 1, category: "programme", title: "Programme confirmation" }),
    makeItem({ id: 2, category: "reservations", title: "Restaurants confirmed" }),
    makeItem({ id: 3, category: "reservations", title: "Beach clubs confirmed" }),
    makeItem({ id: 4, category: "reservations", title: "Night clubs confirmed" }),
    makeItem({ id: 5, category: "transport", title: "Driver confirmed" }),
    makeItem({ id: 6, category: "accommodation", title: "Hotel confirmed" }),
    makeItem({ id: 7, category: "concierge_services", title: "Yacht confirmed" }),
    makeItem({ id: 8, category: "payments", title: "Deposit requested" }),
  ];

  const visibleCategories = getVisibleChecklistCategories(
    items,
    trip,
    context,
    today
  );

  assert(visibleCategories.includes("programme"), "programme category visible");
  assert(visibleCategories.includes("reservations"), "reservations visible");
  assert(!visibleCategories.includes("transport"), "transport hidden without driver");
  assert(!visibleCategories.includes("accommodation"), "accommodation hidden without hotel");
  assert(!visibleCategories.includes("concierge_services"), "concierge hidden without yacht");
  assert(visibleCategories.includes("payments"), "payments visible");

  const visibleItems = getVisibleChecklistItems(items, trip, context, today);
  assert(
    !visibleItems.some((item) => item.title === "Yacht confirmed"),
    "yacht template hidden"
  );

  const addable = getAddableChecklistCategories(items, trip, context, today);
  assert(addable.includes("transport"), "transport can be added manually");
  assert(!addable.includes("programme"), "programme not in add list when visible");

  console.log("Checklist display checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
