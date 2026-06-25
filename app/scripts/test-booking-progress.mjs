#!/usr/bin/env node
/**
 * Verify Booking Progress eligibility rules.
 * Run: npx tsx scripts/test-booking-progress.mjs (from app/)
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

function makeTrip(overrides = {}) {
  return {
    id: 1,
    client_id: null,
    client_name: "Client A",
    destination: "Saint-Tropez",
    arrival_date: "2026-07-01",
    departure_date: "2026-07-07",
    follow_up_status: "confirmed",
    payment_status: "pending",
    total_amount: "",
    amount_received: "",
    days: [
      {
        id: 10,
        trip_id: 1,
        date: "2026-07-02",
        sections: [],
        activities: [
          {
            id: 100,
            trip_day_id: 10,
            period: "evening",
            activity_type: "restaurant",
            time: "20:00",
            title: "La Vague d'Or",
            details: "",
            status: "confirmed",
            booking_status: "to_request",
            assigned_to: "",
            booking_notes: "",
            sort_order: 0,
          },
        ],
      },
    ],
    ...overrides,
  };
}

const {
  isClientProgrammeConfirmed,
  qualifiesForBookingProgress,
  listBookingProgressPlanners,
  buildBookingProgressPlanner,
  hasOpenReservationBookings,
  countBookingsRequiringAction,
} = await loadModule("src/lib/dashboard/booking-progress.ts");

const {
  isBookingProgressComplete,
  isBookingRequiringAction,
  sortBookingProgressItems,
} = await loadModule("src/lib/reservations/reservation-status.ts");

assert(isClientProgrammeConfirmed(makeTrip()), "confirmed programme");
assert(
  !isClientProgrammeConfirmed(makeTrip({ follow_up_status: "follow_up" })),
  "not confirmed"
);
assert(!isBookingProgressComplete("paid"), "paid still requires action");
assert(isBookingProgressComplete("confirmed"), "confirmed complete");
assert(!isBookingProgressComplete("to_request"), "to_request open");
assert(isBookingRequiringAction("paid"), "paid requires action");

const openTrip = makeTrip();
assert(qualifiesForBookingProgress(openTrip), "open trip qualifies");
assert(
  hasOpenReservationBookings(buildBookingProgressPlanner(openTrip).items),
  "has open bookings"
);

const paidTrip = makeTrip({
  days: [
    {
      id: 10,
      trip_id: 1,
      date: "2026-07-02",
      sections: [],
      activities: [
        {
          id: 100,
          trip_day_id: 10,
          period: "evening",
          activity_type: "restaurant",
          time: "20:00",
          title: "La Vague d'Or",
          details: "",
          status: "confirmed",
          booking_status: "paid",
          assigned_to: "matthieu",
          booking_notes: "",
          sort_order: 0,
        },
      ],
    },
  ],
});
assert(qualifiesForBookingProgress(paidTrip), "paid trip still visible");

const doneTrip = makeTrip({
  days: [
    {
      id: 10,
      trip_id: 1,
      date: "2026-07-02",
      sections: [],
      activities: [
        {
          id: 100,
          trip_day_id: 10,
          period: "evening",
          activity_type: "restaurant",
          time: "20:00",
          title: "La Vague d'Or",
          details: "",
          status: "confirmed",
          booking_status: "confirmed",
          assigned_to: "matthieu",
          booking_notes: "",
          sort_order: 0,
        },
      ],
    },
  ],
});
assert(!qualifiesForBookingProgress(doneTrip), "fully booked trip hidden");

const planners = listBookingProgressPlanners([openTrip, doneTrip, paidTrip]);
assert(planners.length === 2, "two planners listed");
assert(planners[0]?.summary.priority === "high", "to_request planner first");
assert(planners[0]?.summary.remaining === 1, "one booking remaining");
assert(
  countBookingsRequiringAction(planners) === 2,
  "two bookings requiring action"
);

const sorted = sortBookingProgressItems([
  {
    activityId: 1,
    venue: "B",
    date: "2026-07-03",
    time: "12:00",
    category: "restaurant",
    categoryLabel: "Restaurant",
    booking_status: "confirmed",
    assigned_to: "",
    booking_notes: "",
  },
  {
    activityId: 2,
    venue: "A",
    date: "2026-07-02",
    time: "20:00",
    category: "restaurant",
    categoryLabel: "Restaurant",
    booking_status: "to_request",
    assigned_to: "",
    booking_notes: "",
  },
]);
assert(sorted[0]?.booking_status === "to_request", "actionable booking first");

console.log("booking-progress tests passed");
