#!/usr/bin/env node
/**
 * Verify booking priority sorting and labels.
 * Run: npx tsx scripts/test-booking-priority.mjs (from app/)
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

const {
  compareBookingPrioritySortFields,
  formatBookingPriorityGuestLabel,
  formatBookingPriorityStayDates,
  listBookingPriorityItems,
  resolveBookingPriorityLevel,
} = await loadModule("src/lib/dashboard/booking-priority.ts");

assert(
  formatBookingPriorityStayDates("2026-07-11", "2026-07-16") ===
    "11 Jul – 16 Jul",
  "compact stay dates"
);
assert(
  formatBookingPriorityGuestLabel("4 guests") === "4 Guests",
  "guest label"
);

const highRemaining = compareBookingPrioritySortFields(
  {
    remaining: 11,
    arrival_date: "2026-07-11",
    waiting_confirmations: 0,
    pending_transfers: 0,
    pending_payment: 0,
  },
  {
    remaining: 9,
    arrival_date: "2026-07-27",
    waiting_confirmations: 2,
    pending_transfers: 0,
    pending_payment: 0,
  }
);
assert(highRemaining < 0, "more remaining ranks first");

const soonerArrival = compareBookingPrioritySortFields(
  {
    remaining: 5,
    arrival_date: "2026-07-11",
    waiting_confirmations: 0,
    pending_transfers: 0,
    pending_payment: 0,
  },
  {
    remaining: 5,
    arrival_date: "2026-07-27",
    waiting_confirmations: 0,
    pending_transfers: 0,
    pending_payment: 0,
  }
);
assert(soonerArrival < 0, "sooner arrival ranks first");

assert(
  resolveBookingPriorityLevel({
    summary: {
      total: 10,
      confirmed: 10,
      remaining: 0,
      percent: 100,
      priority: "medium",
      progressTone: "confirmed",
    },
  }) === "ready",
  "ready when no remaining"
);

assert(
  resolveBookingPriorityLevel({
    summary: {
      total: 10,
      confirmed: 0,
      remaining: 11,
      percent: 0,
      priority: "high",
      progressTone: "urgent",
    },
  }) === "high",
  "high when to_request exists"
);

const items = listBookingPriorityItems([
  {
    id: 1,
    client_name: "Hayden Kaplan",
    destination: "Saint Tropez",
    arrival_date: "2026-07-11",
    departure_date: "2026-07-16",
    follow_up_status: "confirmed",
    tailored_for: "4",
    payment_status: "paid",
    days: [
      {
        id: 10,
        trip_id: 1,
        date: "2026-07-12",
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
  {
    id: 2,
    client_name: "Scott Gilbert",
    destination: "Monaco GP",
    arrival_date: "2026-05-23",
    departure_date: "2026-05-25",
    follow_up_status: "confirmed",
    tailored_for: "2",
    payment_status: "paid",
    days: [
      {
        id: 20,
        trip_id: 2,
        date: "2026-05-23",
        sections: [],
        destination_override: "",
        activities: [
          {
            id: 200,
            trip_day_id: 20,
            period: "evening",
            activity_type: "restaurant",
            time: "20:00",
            title: "Louis XV",
            details: "",
            status: "confirmed",
            booking_status: "confirmed",
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
]);

assert(items.length === 2, "includes ready and active programmes");
assert(items[0]?.client_name === "Hayden Kaplan", "highest workload first");
assert(items[0]?.priority === "high", "open bookings are high priority");
assert(items[1]?.priority === "ready", "completed programme is ready");
assert(
  items[1]?.remaining_label === "All bookings completed",
  "ready remaining label"
);

console.log("test-booking-priority: ok");
