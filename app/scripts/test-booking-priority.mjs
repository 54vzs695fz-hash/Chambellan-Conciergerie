#!/usr/bin/env node
/**
 * Verify booking priority sorting, date filtering, and labels.
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
  isBookingPriorityStayActive,
  listBookingPriorityItems,
  pruneBookingPriorityItems,
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

const TODAY = "2026-07-31";

assert(
  isBookingPriorityStayActive("2026-07-10", "2026-07-30", TODAY) === false,
  "stay ended yesterday → excluded"
);
assert(
  isBookingPriorityStayActive("2026-07-10", "2026-07-19", TODAY) === false,
  "stay ended 19 July when today is 31 July → excluded"
);
assert(
  isBookingPriorityStayActive("2026-07-28", "2026-07-31", TODAY) === true,
  "stay ends today → still in stay"
);
assert(
  isBookingPriorityStayActive("2026-07-31", "2026-08-03", TODAY) === true,
  "stay begins today → included"
);
assert(
  isBookingPriorityStayActive("2026-08-05", "2026-08-10", TODAY) === true,
  "future stay → included"
);
assert(
  isBookingPriorityStayActive("", "2026-08-10", TODAY) === false,
  "missing arrival → excluded"
);
assert(
  isBookingPriorityStayActive("2026-08-05", "", TODAY) === false,
  "missing departure → excluded"
);
assert(
  isBookingPriorityStayActive(null, null, TODAY) === false,
  "null dates → excluded"
);

function openBookingActivity(id, dayId) {
  return {
    id,
    trip_day_id: dayId,
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
  };
}

function confirmedTrip(overrides) {
  return {
    id: 1,
    client_name: "Client",
    destination: "Monaco",
    arrival_date: "2026-08-01",
    departure_date: "2026-08-05",
    follow_up_status: "confirmed",
    tailored_for: "2",
    payment_status: "pending",
    days: [
      {
        id: 10,
        trip_id: 1,
        date: "2026-08-01",
        sections: [],
        destination_override: "",
        activities: [openBookingActivity(100, 10)],
      },
    ],
    ...overrides,
  };
}

const pastWithOpenBookings = listBookingPriorityItems(
  [
    confirmedTrip({
      id: 9,
      client_name: "Past Client",
      arrival_date: "2026-07-10",
      departure_date: "2026-07-19",
      days: [
        {
          id: 90,
          trip_id: 9,
          date: "2026-07-12",
          sections: [],
          destination_override: "",
          activities: [openBookingActivity(900, 90)],
        },
      ],
    }),
  ],
  [],
  TODAY
);
assert(
  pastWithOpenBookings.length === 0,
  "old planner with unfinished bookings → excluded"
);

const items = listBookingPriorityItems(
  [
    confirmedTrip({
      id: 1,
      client_name: "Hayden Kaplan",
      destination: "Saint Tropez",
      arrival_date: "2026-08-11",
      departure_date: "2026-08-16",
      tailored_for: "4",
      payment_status: "fully_paid",
      days: [
        {
          id: 10,
          trip_id: 1,
          date: "2026-08-12",
          sections: [],
          destination_override: "",
          activities: [openBookingActivity(100, 10)],
        },
      ],
    }),
    confirmedTrip({
      id: 2,
      client_name: "Scott Gilbert",
      destination: "Monaco GP",
      arrival_date: "2026-05-23",
      departure_date: "2026-05-25",
      tailored_for: "2",
      payment_status: "fully_paid",
      days: [
        {
          id: 20,
          trip_id: 2,
          date: "2026-05-23",
          sections: [],
          destination_override: "",
          activities: [
            {
              ...openBookingActivity(200, 20),
              title: "Louis XV",
              booking_status: "confirmed",
            },
          ],
        },
      ],
    }),
    confirmedTrip({
      id: 3,
      client_name: "In Stay",
      arrival_date: "2026-07-28",
      departure_date: "2026-07-31",
      days: [
        {
          id: 30,
          trip_id: 3,
          date: "2026-07-29",
          sections: [],
          destination_override: "",
          activities: [openBookingActivity(300, 30)],
        },
      ],
    }),
    confirmedTrip({
      id: 4,
      client_name: "Starts Today",
      arrival_date: "2026-07-31",
      departure_date: "2026-08-02",
      days: [
        {
          id: 40,
          trip_id: 4,
          date: "2026-07-31",
          sections: [],
          destination_override: "",
          activities: [openBookingActivity(400, 40)],
        },
      ],
    }),
    confirmedTrip({
      id: 5,
      client_name: "Ready Future",
      arrival_date: "2026-08-20",
      departure_date: "2026-08-25",
      days: [
        {
          id: 50,
          trip_id: 5,
          date: "2026-08-20",
          sections: [],
          destination_override: "",
          activities: [
            {
              ...openBookingActivity(500, 50),
              booking_status: "confirmed",
            },
          ],
        },
      ],
    }),
  ],
  [],
  TODAY
);

assert(
  items.every((item) => item.departure_date >= TODAY),
  "no past departure dates in Booking Priority"
);
assert(
  items.every((item) => item.remaining > 0),
  "only planners with bookings requiring action"
);
assert(
  items.every((item) => item.priority !== "ready"),
  "ready programmes are not listed in Booking Priority"
);
assert(
  !items.some((item) => item.client_name === "Scott Gilbert"),
  "past completed planner excluded"
);
assert(
  !items.some((item) => item.client_name === "Ready Future"),
  "future ready planner excluded (no action required)"
);
assert(
  items.some((item) => item.client_name === "Hayden Kaplan"),
  "future stay with open bookings included"
);
assert(
  items.some((item) => item.client_name === "In Stay"),
  "current stay included"
);
assert(
  items.some((item) => item.client_name === "Starts Today"),
  "arrival today included"
);
assert(items[0]?.priority === "high", "open bookings are high priority");

const pruned = pruneBookingPriorityItems(
  [
    {
      tripId: 1,
      client_name: "Past",
      destination: "Nice",
      destination_subtitle: null,
      dates: "10 Jul – 19 Jul",
      arrival_date: "2026-07-10",
      departure_date: "2026-07-19",
      guest_label: null,
      remaining: 5,
      percent: 0,
      progressTone: "urgent",
      priority: "high",
      priority_label: "HIGH PRIORITY",
      priority_emoji: "🔴",
      remaining_label: "5 bookings remaining",
      href: "/planner/1",
    },
    {
      tripId: 2,
      client_name: "Active",
      destination: "Monaco",
      destination_subtitle: null,
      dates: "31 Jul – 2 Aug",
      arrival_date: "2026-07-31",
      departure_date: "2026-08-02",
      guest_label: null,
      remaining: 2,
      percent: 50,
      progressTone: "urgent",
      priority: "high",
      priority_label: "HIGH PRIORITY",
      priority_emoji: "🔴",
      remaining_label: "2 bookings remaining",
      href: "/planner/2",
    },
  ],
  TODAY
);
assert(pruned.length === 1, "prune drops past stay");
assert(pruned[0]?.client_name === "Active", "prune keeps active stay");

console.log("test-booking-priority: ok");
