import { DEFAULT_CHECKLIST_ITEMS } from "@/lib/planner/checklist-defaults";
import { isRelevantPaymentChecklistTitle } from "@/lib/planner/payment-summary";
import { isOpenChecklistStatus } from "@/lib/planner/checklist-utils";
import { toIsoDate, startOfDay } from "@/lib/calendar/programmes";
import type { ActivityType, ChecklistItem, Trip } from "@/lib/types";

export type TripProgrammeContext = {
  activityTypes: Set<ActivityType>;
  transferCount: number;
};

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function normTitle(title: string): string {
  return title.trim().toLowerCase();
}

function isFilled(value: string | undefined | null): boolean {
  return Boolean(String(value ?? "").trim());
}

function hasActivityType(
  context: TripProgrammeContext,
  ...types: ActivityType[]
): boolean {
  return types.some((type) => context.activityTypes.has(type));
}

function countActivityType(
  context: TripProgrammeContext,
  type: ActivityType
): number {
  if (type === "transfer") return context.transferCount;
  return hasActivityType(context, type) ? 1 : 0;
}

export function isDefaultChecklistTitle(
  category: ChecklistItem["category"],
  title: string
): boolean {
  const defaults = DEFAULT_CHECKLIST_ITEMS[category] ?? [];
  const normalized = normTitle(title);
  return defaults.some((entry) => normTitle(entry) === normalized);
}

/** Untouched seeded template row — not a real operational task yet. */
export function isPristineDefaultChecklistItem(item: ChecklistItem): boolean {
  if (item.status !== "todo") return false;
  if (isFilled(item.notes)) return false;
  if (isFilled(item.due_date)) return false;
  if (isFilled(item.reminder_date)) return false;
  return isDefaultChecklistTitle(item.category, item.title);
}

function isInStay(
  trip: Pick<Trip, "arrival_date" | "departure_date">,
  todayStr: string
): boolean {
  if (!trip.arrival_date || !trip.departure_date) return false;
  return trip.arrival_date <= todayStr && todayStr <= trip.departure_date;
}

function isDeparturePhase(
  trip: Pick<Trip, "arrival_date" | "departure_date">,
  todayStr: string
): boolean {
  if (!trip.departure_date) return false;
  if (trip.arrival_date && trip.arrival_date > todayStr) return false;
  return trip.departure_date <= addDaysIso(todayStr, 14);
}

function isRelevantDefaultTitle(
  title: string,
  category: ChecklistItem["category"],
  trip: Trip,
  context: TripProgrammeContext,
  todayStr: string
): boolean {
  const key = normTitle(title);

  if (category === "programme") {
    return true;
  }

  if (category === "payments") {
    return isRelevantPaymentChecklistTitle(title, trip);
  }

  if (category === "arrival") {
    return isFilled(trip.arrival_date);
  }

  if (category === "during_stay") {
    return isInStay(trip, todayStr);
  }

  if (category === "departure") {
    return isDeparturePhase(trip, todayStr);
  }

  if (category === "reservations") {
    if (key === "restaurants confirmed") {
      return (
        isFilled(trip.restaurant_reservations) ||
        hasActivityType(context, "restaurant")
      );
    }
    if (key === "beach clubs confirmed") {
      return hasActivityType(context, "beach_club");
    }
    if (key === "night clubs confirmed") {
      return (
        isFilled(trip.club_reservations) ||
        hasActivityType(context, "club")
      );
    }
    if (key === "event tickets confirmed") {
      return (
        isFilled(trip.event_booking) ||
        isFilled(trip.event_venue) ||
        hasActivityType(context, "event")
      );
    }
    return false;
  }

  if (category === "transport") {
    const hasDriver =
      isFilled(trip.driver_name) ||
      isFilled(trip.driver) ||
      isFilled(trip.driver_phone);
    const hasTransfer = hasActivityType(context, "transfer");

    if (key === "airport transfer booked") {
      return hasDriver || hasTransfer;
    }
    if (key === "driver confirmed" || key === "vehicle assigned") {
      return hasDriver;
    }
    if (key === "return transfer confirmed") {
      return countActivityType(context, "transfer") >= 2 || hasTransfer;
    }
    return false;
  }

  if (category === "accommodation") {
    if (key === "hotel confirmed") return isFilled(trip.hotel);
    if (key === "villa confirmed") return isFilled(trip.villa);
    if (key === "check-in details sent") {
      return isFilled(trip.hotel) || isFilled(trip.villa);
    }
    return false;
  }

  if (category === "concierge_services") {
    if (key === "yacht confirmed") return isFilled(trip.yacht);
    if (key === "security confirmed") {
      return isFilled(trip.security_contact) || isFilled(trip.security);
    }
    if (key === "butler confirmed") {
      return isFilled(trip.butler_name) || isFilled(trip.butler);
    }
    return false;
  }

  return false;
}

/** Whether a checklist row should appear on the dashboard follow-up feed. */
export function isFollowUpEligibleChecklistItem(
  item: ChecklistItem,
  trip: Trip,
  context: TripProgrammeContext,
  today = startOfDay(new Date())
): boolean {
  if (!isOpenChecklistStatus(item.status)) return false;

  if (!isPristineDefaultChecklistItem(item)) {
    return true;
  }

  return isRelevantDefaultTitle(
    item.title,
    item.category,
    trip,
    context,
    toIsoDate(today)
  );
}

/** Checklist rows that belong to a programme's operational progress total. */
export function isTrackedProgrammeChecklistItem(
  item: ChecklistItem,
  trip: Trip,
  context: TripProgrammeContext,
  today = startOfDay(new Date())
): boolean {
  if (!isPristineDefaultChecklistItem(item)) return true;
  return isRelevantDefaultTitle(
    item.title,
    item.category,
    trip,
    context,
    toIsoDate(today)
  );
}

export function buildEmptyProgrammeContext(): TripProgrammeContext {
  return { activityTypes: new Set(), transferCount: 0 };
}
