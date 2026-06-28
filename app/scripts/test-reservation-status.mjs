#!/usr/bin/env node
/**
 * Verify reservation status item generation and summary.
 * Run: node scripts/test-reservation-status.mjs (from app/)
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

function makeActivity(overrides) {
  return {
    id: 1,
    trip_day_id: 10,
    period: "morning",
    activity_type: "restaurant",
    time: "20:00",
    title: "Le Louis XV",
    details: "",
    status: "confirmed",
    booking_status: "to_request",
    sort_order: 0,
    ...overrides,
  };
}

function makeDay(activities) {
  return {
    id: 10,
    trip_id: 1,
    date: "2026-06-15",
    sections: [],
    activities,
  };
}

async function main() {
  const {
    buildReservationStatusItems,
    formatBookingStatusSummary,
    isTrackableReservationActivity,
  } = await loadModule("src/lib/reservations/reservation-status.ts");

  assert(
    !isTrackableReservationActivity(makeActivity({ title: "  " })),
    "Empty title should not be trackable"
  );

  assert(
    !isTrackableReservationActivity(
      makeActivity({ activity_type: "transfer", title: "Airport" })
    ),
    "Transfer should not be trackable"
  );

  assert(
    isTrackableReservationActivity(makeActivity({ activity_type: "club" })),
    "Club with title should be trackable"
  );

  const items = buildReservationStatusItems([
    makeDay([
      makeActivity({
        id: 1,
        title: "Nobu",
        booking_status: "confirmed",
        activity_type: "restaurant",
      }),
      makeActivity({
        id: 2,
        title: "Nikki Beach",
        booking_status: "waiting_confirmation",
        activity_type: "beach_club",
      }),
      makeActivity({
        id: 3,
        title: "",
        activity_type: "restaurant",
      }),
      makeActivity({
        id: 4,
        title: "Heli tour",
        booking_status: "to_request",
        activity_type: "activity",
      }),
    ]),
  ]);

  assert(items.length === 3, `Expected 3 items, got ${items.length}`);
  assert(
    items.some((item) => item.venue === "Nobu" && item.booking_status === "confirmed"),
    "Should include confirmed Nobu reservation"
  );
  assert(
    formatBookingStatusSummary(items) ===
      "1 confirmed · 1 waiting confirmation · 1 to request",
    `Unexpected summary: ${formatBookingStatusSummary(items)}`
  );

  const beachItems = buildReservationStatusItems([
    makeDay([
      makeActivity({
        id: 10,
        title: "Shellona",
        activity_type: "beach_club",
        time: "15:30",
        beach_lunch: false,
        beach_sunbeds: false,
      }),
    ]),
  ]);
  assert(beachItems.length === 1, "legacy beach club time becomes lunch");
  assert(beachItems[0]?.beachClubPart === "lunch", "legacy defaults to lunch");
  assert(beachItems[0]?.time === "15:30", "legacy lunch time preserved");

  const splitBeach = buildReservationStatusItems([
    makeDay([
      makeActivity({
        id: 11,
        title: "Shellona",
        activity_type: "beach_club",
        beach_sunbeds: true,
        beach_sunbeds_time: "12:00",
        beach_sunbeds_status: "to_request",
        beach_lunch: true,
        beach_lunch_time: "15:30",
        beach_lunch_status: "confirmed",
      }),
    ]),
  ]);
  assert(splitBeach.length === 2, "sunbeds and lunch are separate items");
  assert(
    splitBeach.some(
      (item) =>
        item.itemKey === "11:sunbeds" &&
        item.beachClubPart === "sunbeds" &&
        item.booking_status === "to_request"
    ),
    "sunbeds item tracked separately"
  );
  assert(
    splitBeach.some(
      (item) =>
        item.itemKey === "11:lunch" &&
        item.beachClubPart === "lunch" &&
        item.booking_status === "confirmed"
    ),
    "lunch item tracked separately"
  );

  console.log("test-reservation-status: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
