import {
  daysUntilArrival,
  startOfDay,
  toIsoDate,
} from "@/lib/calendar/programmes";
import { getArrivalCountdown } from "@/lib/planner/arrival-countdown";
import { isImportantChecklistItem } from "@/lib/planner/checklist-utils";
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
  if (item.status === "done") return null;
  if (isItineraryItem(item.title)) return "itinerary";
  if (item.category === "payments") return "payment";
  if (item.category === "reservations") return "booking";
  return null;
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

export function buildDashboardFollowUpSummary(
  trips: Trip[],
  checklistItems: ChecklistItem[],
  today = startOfDay(new Date())
): DashboardFollowUpItem[] {
  const todayStr = toIsoDate(today);
  const tripById = new Map<number, TripContext>(
    trips.map((trip) => [
      trip.id,
      {
        id: trip.id,
        client_name: trip.client_name,
        destination: trip.destination,
        arrival_date: trip.arrival_date,
        departure_date: trip.departure_date,
      },
    ])
  );

  const itemsByKind = new Map<DashboardFollowUpKind, DashboardFollowUpItem[]>();
  for (const kind of KIND_ORDER) {
    itemsByKind.set(kind, []);
  }

  const usedChecklistIds = new Set<number>();
  const usedArrivalTrips = new Set<number>();

  for (const item of checklistItems) {
    if (item.status === "done") continue;
    const trip = tripById.get(item.trip_id);
    if (!trip || !isActiveTrip(trip, todayStr)) continue;

    const classified = classifyChecklistItem(item);
    if (classified) {
      const bucket = itemsByKind.get(classified)!;
      const limit = MAX_PER_KIND[classified] ?? 2;
      if (bucket.length < limit) {
        bucket.push(toFollowUpItem(item, trip, classified, today));
        usedChecklistIds.add(item.id);
      }
      continue;
    }

    if (
      isImportantChecklistItem(
        item,
        todayStr,
        trip.arrival_date,
        trip.departure_date
      )
    ) {
      const bucket = itemsByKind.get("urgent")!;
      if (bucket.length < (MAX_PER_KIND.urgent ?? 3)) {
        bucket.push(toFollowUpItem(item, trip, "urgent", today));
        usedChecklistIds.add(item.id);
      }
    }
  }

  for (const trip of tripById.values()) {
    if (!isActiveTrip(trip, todayStr)) continue;
    if (!trip.arrival_date) continue;
    const days = daysUntilArrival(trip.arrival_date, today);
    if (days === null || days < 0 || days > 7) continue;

    const bucket = itemsByKind.get("arrival")!;
    if (bucket.length >= (MAX_PER_KIND.arrival ?? 2)) break;
    if (usedArrivalTrips.has(trip.id)) continue;

    const countdown = getArrivalCountdown(
      trip.arrival_date,
      trip.departure_date,
      today
    );
    bucket.push({
      key: `arrival-${trip.id}`,
      checklistItemId: null,
      tripId: trip.id,
      kind: "arrival",
      task: "Upcoming arrival",
      client_name: trip.client_name || "Client",
      destination: trip.destination || "Programme",
      timing: countdown?.label ?? `Arrival in ${days} days`,
    });
    usedArrivalTrips.add(trip.id);
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
