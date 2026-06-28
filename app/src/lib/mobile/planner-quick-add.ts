import { getEditableSections } from "@/lib/planner/day-sections";
import type { ActivityType, TripDay } from "@/lib/types";

export type MobileQuickAddKind = "reservation" | "transfer" | "note";

export const MOBILE_QUICK_ADD_KINDS: MobileQuickAddKind[] = [
  "reservation",
  "transfer",
  "note",
];

export function isMobileQuickAddKind(value: string): value is MobileQuickAddKind {
  return MOBILE_QUICK_ADD_KINDS.includes(value as MobileQuickAddKind);
}

export const MOBILE_QUICK_ADD_ACTIVITY: Record<
  MobileQuickAddKind,
  ActivityType
> = {
  reservation: "restaurant",
  transfer: "transportation",
  note: "note",
};

export function pickQuickAddTarget(
  days: TripDay[]
): { dayId: number; period: string } | null {
  if (!days.length) return null;

  const today = new Date().toISOString().slice(0, 10);
  const day =
    days.find((item) => item.date === today) ??
    days.find((item) => item.date && item.date >= today) ??
    days[0];

  const sections = getEditableSections(day);
  const section = sections[0];
  if (!section) return null;

  return { dayId: day.id, period: section.id };
}

export function defaultWeekRange(): { arrival: string; departure: string } {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    arrival: start.toISOString().slice(0, 10),
    departure: end.toISOString().slice(0, 10),
  };
}

export const PLANNER_QUICK_ADD_EVENT = "chambellan:planner-quick-add";
