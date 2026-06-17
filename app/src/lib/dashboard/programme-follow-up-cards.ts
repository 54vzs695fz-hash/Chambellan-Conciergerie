import { daysUntilArrival, startOfDay, toIsoDate } from "@/lib/calendar/programmes";
import {
  buildEmptyProgrammeContext,
  isFollowUpEligibleChecklistItem,
  isTrackedProgrammeChecklistItem,
  type TripProgrammeContext,
} from "@/lib/dashboard/checklist-follow-up-eligibility";
import { getArrivalCountdown } from "@/lib/planner/arrival-countdown";
import { needsPaymentWarning } from "@/lib/planner/payment-status";
import {
  buildTripPaymentSummary,
  paymentRemainingBadgeLabel,
} from "@/lib/planner/payment-summary";
import {
  isActionRequiredChecklistItem,
  isImportantChecklistItem,
  isOpenChecklistStatus,
} from "@/lib/planner/checklist-utils";
import type {
  ChecklistItem,
  DashboardProgrammeCardTone,
  DashboardProgrammeFollowUpCard,
  Trip,
} from "@/lib/types";

const MAX_PROGRAMMES = 12;
const MAX_OUTSTANDING = 5;

function isActiveTrip(trip: Trip, todayStr: string): boolean {
  if (trip.departure_date && trip.departure_date < todayStr) return false;
  return true;
}

function isOperationalTrip(trip: Trip, todayStr: string): boolean {
  if (!isActiveTrip(trip, todayStr)) return false;
  if (trip.follow_up_status === "completed") return false;
  return true;
}

function itemPriority(
  item: ChecklistItem,
  todayStr: string,
  arrivalDate: string,
  departureDate: string
): number {
  if (item.status === "in_progress") return 0;
  if (item.due_date && item.due_date < todayStr) return 1;
  if (item.due_date && item.due_date === todayStr) return 2;
  if (item.reminder_date && item.reminder_date <= todayStr) return 3;
  if (
    isImportantChecklistItem(item, todayStr, arrivalDate, departureDate)
  ) {
    return 4;
  }
  if (item.status === "todo") return 5;
  return 6;
}

function resolveCardTone(
  trip: Trip,
  openActionItems: ChecklistItem[],
  trackedItems: ChecklistItem[],
  today: Date
): DashboardProgrammeCardTone {
  const todayStr = toIsoDate(today);
  const hasUrgent = openActionItems.some((item) =>
    isImportantChecklistItem(
      item,
      todayStr,
      trip.arrival_date,
      trip.departure_date
    )
  );

  if (hasUrgent || openActionItems.some((item) => item.status === "in_progress")) {
    return "urgent";
  }

  const paymentNeedsAttention =
    trip.payment_status === "pending" ||
    trip.payment_status === "deposit_paid" ||
    needsPaymentWarning(trip.arrival_date, trip.payment_status) ||
    (buildTripPaymentSummary(trip).remainingBalance ?? 0) > 0;

  if (paymentNeedsAttention) {
    return "payment";
  }

  const days = trip.arrival_date
    ? daysUntilArrival(trip.arrival_date, today)
    : null;
  if (days !== null && days >= 0 && days <= 7) {
    return "arrival";
  }

  const allComplete =
    trackedItems.length > 0 &&
    trackedItems.every((item) => item.status === "done");

  if (allComplete) {
    return "complete";
  }

  if (days !== null && days >= 0 && days <= 14) {
    return "arrival";
  }

  return openActionItems.length > 0 ? "urgent" : "complete";
}

function shouldShowProgramme(
  trip: Trip,
  trackedItems: ChecklistItem[],
  openActionItems: ChecklistItem[],
  today: Date
): boolean {
  if (openActionItems.length > 0) return true;
  if (trackedItems.length > 0) return true;

  const days = trip.arrival_date
    ? daysUntilArrival(trip.arrival_date, today)
    : null;
  if (days !== null && days >= 0 && days <= 14) return true;

  return (
    trip.payment_status === "pending" || trip.payment_status === "deposit_paid"
  );
}

export function buildDashboardProgrammeFollowUpCards(
  trips: Trip[],
  checklistItems: ChecklistItem[],
  programmeContextByTripId: Map<number, TripProgrammeContext> = new Map(),
  today = startOfDay(new Date())
): DashboardProgrammeFollowUpCard[] {
  const todayStr = toIsoDate(today);
  const itemsByTrip = new Map<number, ChecklistItem[]>();

  for (const item of checklistItems) {
    const list = itemsByTrip.get(item.trip_id) ?? [];
    list.push(item);
    itemsByTrip.set(item.trip_id, list);
  }

  const cards: DashboardProgrammeFollowUpCard[] = [];

  for (const trip of trips) {
    if (!isOperationalTrip(trip, todayStr)) continue;

    const context =
      programmeContextByTripId.get(trip.id) ?? buildEmptyProgrammeContext();
    const tripItems = itemsByTrip.get(trip.id) ?? [];

    const trackedItems = tripItems.filter((item) =>
      isTrackedProgrammeChecklistItem(item, trip, context, today)
    );

    const openActionItems = trackedItems
      .filter(
        (item) =>
          isOpenChecklistStatus(item.status) &&
          isFollowUpEligibleChecklistItem(item, trip, context, today) &&
          isActionRequiredChecklistItem(
            item,
            todayStr,
            trip.arrival_date,
            trip.departure_date
          )
      )
      .sort(
        (a, b) =>
          itemPriority(
            a,
            todayStr,
            trip.arrival_date,
            trip.departure_date
          ) -
            itemPriority(
              b,
              todayStr,
              trip.arrival_date,
              trip.departure_date
            ) ||
          a.title.localeCompare(b.title)
      );

    if (!shouldShowProgramme(trip, trackedItems, openActionItems, today)) {
      continue;
    }

    const tasksCompleted = trackedItems.filter(
      (item) => item.status === "done"
    ).length;
    const tasksTotal = trackedItems.length;
    const countdown =
      getArrivalCountdown(
        trip.arrival_date,
        trip.departure_date,
        today
      )?.label ?? "";

    cards.push({
      key: `programme-${trip.id}`,
      tripId: trip.id,
      client_name: trip.client_name || "Client",
      destination: trip.destination || "Programme",
      arrival_date: trip.arrival_date,
      arrival_countdown: countdown,
      follow_up_status: trip.follow_up_status ?? "follow_up",
      payment_status: trip.payment_status ?? "pending",
      payment_detail: paymentRemainingBadgeLabel(trip),
      tasks_completed: tasksCompleted,
      tasks_total: tasksTotal,
      outstanding_tasks: openActionItems
        .slice(0, MAX_OUTSTANDING)
        .map((item) => item.title),
      tone: resolveCardTone(trip, openActionItems, trackedItems, today),
      href: `/calendar?programme=${trip.id}`,
    });
  }

  cards.sort((a, b) => {
    const toneOrder: Record<DashboardProgrammeCardTone, number> = {
      urgent: 0,
      payment: 1,
      arrival: 2,
      complete: 3,
    };
    const toneDiff = toneOrder[a.tone] - toneOrder[b.tone];
    if (toneDiff !== 0) return toneDiff;

    const tripA = trips.find((trip) => trip.id === a.tripId);
    const tripB = trips.find((trip) => trip.id === b.tripId);
    const daysA = tripA?.arrival_date
      ? daysUntilArrival(tripA.arrival_date, today)
      : null;
    const daysB = tripB?.arrival_date
      ? daysUntilArrival(tripB.arrival_date, today)
      : null;
    return (daysA ?? 999) - (daysB ?? 999);
  });

  return cards.slice(0, MAX_PROGRAMMES);
}
