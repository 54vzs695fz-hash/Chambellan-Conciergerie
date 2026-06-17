import {
  startOfDay,
  toIsoDate,
} from "@/lib/calendar/programmes";
import {
  buildEmptyProgrammeContext,
  isFollowUpEligibleChecklistItem,
  type TripProgrammeContext,
} from "@/lib/dashboard/checklist-follow-up-eligibility";
import { getArrivalCountdown } from "@/lib/planner/arrival-countdown";
import {
  isActionRequiredChecklistItem,
  isImportantChecklistItem,
  isOpenChecklistStatus,
} from "@/lib/planner/checklist-utils";
import type {
  ChecklistItem,
  DashboardFollowUpItem,
  DashboardFollowUpKind,
  Trip,
} from "@/lib/types";

const MAX_TOTAL = 10;
const MAX_PER_KIND: Partial<Record<DashboardFollowUpKind, number>> = {
  urgent: 3,
  itinerary: 2,
  payment: 2,
  booking: 2,
  arrival: 2,
};

const KIND_ORDER: DashboardFollowUpKind[] = [
  "urgent",
  "itinerary",
  "payment",
  "booking",
  "arrival",
];

const KIND_LABELS: Record<DashboardFollowUpKind, string> = {
  urgent: "Urgent",
  arrival: "Arrival",
  payment: "Payment",
  booking: "Booking",
  itinerary: "Itinerary",
};

export { KIND_LABELS };

type TripContext = {
  id: number;
  client_name: string;
  destination: string;
  arrival_date: string;
  departure_date: string;
};

function formatTiming(
  item: ChecklistItem,
  trip: TripContext,
  today: Date
): string {
  const todayStr = toIsoDate(today);
  if (item.due_date) {
    if (item.due_date < todayStr) return `Overdue · ${item.due_date}`;
    if (item.due_date === todayStr) return "Due today";
    return `Due ${item.due_date}`;
  }
  if (item.reminder_date && item.reminder_date <= todayStr) {
    return `Reminder ${item.reminder_date}`;
  }
  const countdown = getArrivalCountdown(
    trip.arrival_date,
    trip.departure_date,
    today
  );
  return countdown?.label ?? "";
}

function isItineraryItem(title: string): boolean {
  return title.trim().toLowerCase() === "final itinerary sent";
}

function isActiveTrip(trip: TripContext, todayStr: string): boolean {
  if (trip.departure_date && trip.departure_date < todayStr) return false;
  return true;
}

function classifyChecklistItem(
  item: ChecklistItem
): DashboardFollowUpKind | null {
  if (!isOpenChecklistStatus(item.status)) return null;
  if (isItineraryItem(item.title)) return "itinerary";
  if (item.category === "payments") return "payment";
  if (item.category === "reservations") return "booking";
  if (item.category === "arrival") return "arrival";
  return null;
}

function isOperationalTrip(trip: Trip, todayStr: string): boolean {
  if (!isActiveTrip(trip, todayStr)) return false;
  if (trip.follow_up_status === "completed") return false;
  return true;
}

function toFollowUpItem(
  item: ChecklistItem,
  trip: TripContext,
  kind: DashboardFollowUpKind,
  today: Date
): DashboardFollowUpItem {
  return {
    key: `checklist-${item.id}`,
    checklistItemId: item.id,
    tripId: trip.id,
    kind,
    task: item.title,
    client_name: trip.client_name || "Client",
    destination: trip.destination || "Programme",
    timing: formatTiming(item, trip, today),
  };
}

function resolveKind(
  item: ChecklistItem,
  todayStr: string,
  arrivalDate: string,
  departureDate: string
): DashboardFollowUpKind | null {
  if (!isActionRequiredChecklistItem(item, todayStr, arrivalDate, departureDate)) {
    return null;
  }

  const classified = classifyChecklistItem(item);
  if (classified) return classified;

  if (
    isImportantChecklistItem(
      item,
      todayStr,
      arrivalDate,
      departureDate
    )
  ) {
    return "urgent";
  }

  if (item.status === "in_progress") {
    return "urgent";
  }

  return "arrival";
}

export function buildDashboardFollowUpSummary(
  trips: Trip[],
  checklistItems: ChecklistItem[],
  programmeContextByTripId: Map<number, TripProgrammeContext> = new Map(),
  today = startOfDay(new Date())
): DashboardFollowUpItem[] {
  const todayStr = toIsoDate(today);
  const tripById = new Map<number, Trip>(
    trips.map((trip) => [trip.id, trip])
  );

  const itemsByKind = new Map<DashboardFollowUpKind, DashboardFollowUpItem[]>();
  for (const kind of KIND_ORDER) {
    itemsByKind.set(kind, []);
  }

  for (const item of checklistItems) {
    if (!isOpenChecklistStatus(item.status)) continue;

    const trip = tripById.get(item.trip_id);
    if (!trip || !isOperationalTrip(trip, todayStr)) continue;

    const context =
      programmeContextByTripId.get(trip.id) ?? buildEmptyProgrammeContext();

    if (!isFollowUpEligibleChecklistItem(item, trip, context, today)) {
      continue;
    }

    if (
      !isActionRequiredChecklistItem(
        item,
        todayStr,
        trip.arrival_date,
        trip.departure_date
      )
    ) {
      continue;
    }

    const kind = resolveKind(
      item,
      todayStr,
      trip.arrival_date,
      trip.departure_date
    );
    if (!kind) continue;

    const bucket = itemsByKind.get(kind)!;
    const limit = MAX_PER_KIND[kind] ?? 2;
    if (bucket.length >= limit) continue;

    bucket.push(toFollowUpItem(item, trip, kind, today));
  }

  const result: DashboardFollowUpItem[] = [];
  for (const kind of KIND_ORDER) {
    for (const item of itemsByKind.get(kind) ?? []) {
      if (result.length >= MAX_TOTAL) return result;
      result.push(item);
    }
  }

  return result;
}
