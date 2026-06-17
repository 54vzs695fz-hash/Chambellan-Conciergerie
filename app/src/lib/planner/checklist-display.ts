import { CHECKLIST_CATEGORY_ORDER } from "@/lib/planner/checklist-defaults";
import {
  isTrackedProgrammeChecklistItem,
  type TripProgrammeContext,
} from "@/lib/dashboard/checklist-follow-up-eligibility";
import { startOfDay } from "@/lib/calendar/programmes";
import type { ChecklistCategory, ChecklistItem, Trip } from "@/lib/types";

export function getVisibleChecklistItems(
  items: ChecklistItem[],
  trip: Trip,
  context: TripProgrammeContext,
  today = startOfDay(new Date())
): ChecklistItem[] {
  return items.filter((item) =>
    isTrackedProgrammeChecklistItem(item, trip, context, today)
  );
}

export function getVisibleChecklistCategories(
  items: ChecklistItem[],
  trip: Trip,
  context: TripProgrammeContext,
  today = startOfDay(new Date())
): ChecklistCategory[] {
  const visibleItems = getVisibleChecklistItems(items, trip, context, today);
  const categories = new Set<ChecklistCategory>();
  for (const item of visibleItems) {
    categories.add(item.category);
  }
  return CHECKLIST_CATEGORY_ORDER.filter((category) => categories.has(category));
}

export function getAddableChecklistCategories(
  items: ChecklistItem[],
  trip: Trip,
  context: TripProgrammeContext,
  today = startOfDay(new Date())
): ChecklistCategory[] {
  const visible = new Set(
    getVisibleChecklistCategories(items, trip, context, today)
  );
  return CHECKLIST_CATEGORY_ORDER.filter((category) => !visible.has(category));
}

export function groupVisibleChecklistItems(
  items: ChecklistItem[],
  trip: Trip,
  context: TripProgrammeContext,
  today = startOfDay(new Date())
): Map<ChecklistCategory, ChecklistItem[]> {
  const visibleItems = getVisibleChecklistItems(items, trip, context, today);
  const map = new Map<ChecklistCategory, ChecklistItem[]>();

  for (const category of getVisibleChecklistCategories(
    items,
    trip,
    context,
    today
  )) {
    map.set(category, []);
  }

  for (const item of visibleItems) {
    const list = map.get(item.category);
    if (list) list.push(item);
  }

  return map;
}
