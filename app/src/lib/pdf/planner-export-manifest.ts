import type { Activity, TripDay, TripWithDays } from "@/lib/types";
import { getVisibleSections } from "@/lib/planner/day-sections";
import type { PlannerExportVariant } from "@/lib/planner/planner-sheet-model";
import {
  groupActivitiesByLuxuryPeriod,
  sortSectionsByItineraryOrder,
  type LuxuryItineraryActivity,
} from "@/lib/planner-utils";

export function activityHasVisibleExportContent(activity: Activity): boolean {
  return Boolean(
    activity.time || activity.title?.trim() || activity.details?.trim()
  );
}

function visibleActivitiesForDay(day: TripDay): Activity[] {
  return day.activities.filter(activityHasVisibleExportContent);
}

function orderedActiveSections(day: TripDay) {
  const sections = getVisibleSections(day);
  return sortSectionsByItineraryOrder(
    sections.filter((section) =>
      day.activities.some(
        (activity) =>
          activity.period === section.id &&
          activityHasVisibleExportContent(activity)
      )
    )
  );
}

function luxuryItemsForDay(day: TripDay): LuxuryItineraryActivity<Activity>[] {
  return orderedActiveSections(day).flatMap((section) =>
    day.activities
      .filter(
        (activity) =>
          activity.period === section.id &&
          activityHasVisibleExportContent(activity)
      )
      .map((activity) => ({ activity, sectionLabel: section.label }))
  );
}

export interface PlannerDayExportManifest {
  date: string;
  afternoon: number;
  evening: number;
  total: number;
}

export interface PlannerExportManifest {
  variant: PlannerExportVariant;
  days: number;
  dayColumns: number;
  activities: number;
  sections: number;
  notes: number;
  team: number;
  stayContacts: number;
  afternoon: number;
  evening: number;
  byDay: PlannerDayExportManifest[];
}

export function getPlannerDayExportManifest(day: TripDay): PlannerDayExportManifest | null {
  const items = luxuryItemsForDay(day);
  if (items.length === 0) return null;

  const groups = groupActivitiesByLuxuryPeriod(items);
  const afternoon = groups.get("afternoon")?.length ?? 0;
  const evening = groups.get("evening")?.length ?? 0;

  return {
    date: day.date,
    afternoon,
    evening,
    total: items.length,
  };
}

export function getPlannerExportManifest(
  trip: TripWithDays,
  variant: PlannerExportVariant,
  stayContactCount = 0,
  teamCount = 0
): PlannerExportManifest {
  const byDay: PlannerDayExportManifest[] = [];
  let dayColumns = 0;
  let activities = 0;
  let sections = 0;
  let afternoon = 0;
  let evening = 0;

  for (const day of trip.days) {
    const dayManifest = getPlannerDayExportManifest(day);
    if (!dayManifest) continue;

    byDay.push(dayManifest);
    dayColumns += 1;
    activities += dayManifest.total;
    afternoon += dayManifest.afternoon;
    evening += dayManifest.evening;
    sections += orderedActiveSections(day).length;
  }

  return {
    variant,
    days: trip.days.length,
    dayColumns,
    activities,
    sections,
    afternoon,
    evening,
    notes: variant === "concierge" && Boolean(trip.notes?.trim()) ? 1 : 0,
    team: variant === "concierge" ? teamCount : 0,
    stayContacts: stayContactCount,
    byDay,
  };
}

export interface PlannerDayDomCounts {
  date: string;
  afternoon: number;
  evening: number;
  total: number;
  visibleTotal: number;
  visibleAfternoon: number;
  visibleEvening: number;
}

export interface PlannerExportDomCounts {
  dayColumns: number;
  activities: number;
  sections: number;
  notes: number;
  team: number;
  stayContacts: number;
  afternoon: number;
  evening: number;
  visibleActivities: number;
  visibleAfternoon: number;
  visibleEvening: number;
  byDay: PlannerDayDomCounts[];
}

function isElementVisibleInContainer(
  container: Element,
  element: Element
): boolean {
  const containerRect = container.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  return (
    rect.top >= containerRect.top - 1 &&
    rect.bottom <= containerRect.bottom + 1 &&
    rect.left >= containerRect.left - 1 &&
    rect.right <= containerRect.right + 1
  );
}

function measureClientDayDom(card: Element, index: number): PlannerDayDomCounts {
  const afternoonCards = card.querySelectorAll(
    ".lux-period-block--afternoon .lux-travel-card"
  );
  const eveningCards = card.querySelectorAll(
    ".lux-period-block--evening .lux-travel-card"
  );
  const allCards = card.querySelectorAll(".lux-travel-card");

  const visibleAfternoon = [...afternoonCards].filter((el) =>
    isElementVisibleInContainer(card, el)
  ).length;
  const visibleEvening = [...eveningCards].filter((el) =>
    isElementVisibleInContainer(card, el)
  ).length;
  const visibleTotal = [...allCards].filter((el) =>
    isElementVisibleInContainer(card, el)
  ).length;

  const dateEl = card.querySelector(".lux-day-card-date");
  const date = dateEl?.textContent?.trim() || `day-${index + 1}`;

  return {
    date,
    afternoon: afternoonCards.length,
    evening: eveningCards.length,
    total: allCards.length,
    visibleTotal,
    visibleAfternoon,
    visibleEvening,
  };
}

function measureConciergeDayDom(column: Element, index: number): PlannerDayDomCounts {
  const cards = column.querySelectorAll(".lux-activity-card--itinerary");
  const visibleTotal = [...cards].filter((el) =>
    isElementVisibleInContainer(column, el)
  ).length;
  const dateEl = column.querySelector(".lux-day-date");

  return {
    date: dateEl?.textContent?.trim() || `day-${index + 1}`,
    afternoon: 0,
    evening: 0,
    total: cards.length,
    visibleTotal,
    visibleAfternoon: 0,
    visibleEvening: 0,
  };
}

export function measurePlannerExportDom(
  variant: PlannerExportVariant
): PlannerExportDomCounts {
  const root = document.querySelector(".lux-print-root .lux-document");
  if (!root) {
    return {
      dayColumns: 0,
      activities: 0,
      sections: 0,
      notes: 0,
      team: 0,
      stayContacts: 0,
      afternoon: 0,
      evening: 0,
      visibleActivities: 0,
      visibleAfternoon: 0,
      visibleEvening: 0,
      byDay: [],
    };
  }

  if (variant === "client") {
    const byDay = [...root.querySelectorAll(".lux-day-card")].map((card, index) =>
      measureClientDayDom(card, index)
    );

    return {
      dayColumns: byDay.length,
      activities: byDay.reduce((sum, day) => sum + day.total, 0),
      sections: root.querySelectorAll(".lux-period-block").length,
      notes: 0,
      team: 0,
      stayContacts: root.querySelectorAll(".lux-travel-info-item").length,
      afternoon: byDay.reduce((sum, day) => sum + day.afternoon, 0),
      evening: byDay.reduce((sum, day) => sum + day.evening, 0),
      visibleActivities: byDay.reduce((sum, day) => sum + day.visibleTotal, 0),
      visibleAfternoon: byDay.reduce((sum, day) => sum + day.visibleAfternoon, 0),
      visibleEvening: byDay.reduce((sum, day) => sum + day.visibleEvening, 0),
      byDay,
    };
  }

  const byDay = [...root.querySelectorAll(".lux-day-column")].map((column, index) =>
    measureConciergeDayDom(column, index)
  );

  return {
    dayColumns: byDay.length,
    activities: byDay.reduce((sum, day) => sum + day.total, 0),
    sections: root.querySelectorAll(".lux-itinerary-block").length,
    notes: root.querySelectorAll(".lux-notes-text").length,
    team: root.querySelectorAll(".lux-team-card").length,
    stayContacts: root.querySelectorAll(".lux-travel-info-item").length,
    afternoon: 0,
    evening: 0,
    visibleActivities: byDay.reduce((sum, day) => sum + day.visibleTotal, 0),
    visibleAfternoon: 0,
    visibleEvening: 0,
    byDay,
  };
}

export function plannerExportDomMatchesManifest(
  expected: PlannerExportManifest,
  actual: PlannerExportDomCounts
): boolean {
  if (
    actual.dayColumns !== expected.dayColumns ||
    actual.activities !== expected.activities ||
    actual.sections !== expected.sections ||
    actual.notes !== expected.notes ||
    actual.team !== expected.team ||
    actual.stayContacts !== expected.stayContacts ||
    actual.visibleActivities !== expected.activities
  ) {
    return false;
  }

  if (expected.variant === "client") {
    if (
      actual.afternoon !== expected.afternoon ||
      actual.evening !== expected.evening ||
      actual.visibleAfternoon !== expected.afternoon ||
      actual.visibleEvening !== expected.evening
    ) {
      return false;
    }
  }

  if (expected.byDay.length !== actual.byDay.length) return false;

  return expected.byDay.every((expectedDay, index) => {
    const actualDay = actual.byDay[index];
    if (!actualDay) return false;
    if (
      actualDay.total !== expectedDay.total ||
      actualDay.visibleTotal !== expectedDay.total
    ) {
      return false;
    }

    if (expected.variant !== "client") return true;

    return (
      actualDay.afternoon === expectedDay.afternoon &&
      actualDay.evening === expectedDay.evening &&
      actualDay.visibleAfternoon === expectedDay.afternoon &&
      actualDay.visibleEvening === expectedDay.evening
    );
  });
}

export function formatPlannerExportDebugLog(
  expected: PlannerExportManifest,
  actual: PlannerExportDomCounts
): string {
  const lines = [
    `export activities: expected ${expected.activities}, rendered ${actual.activities}, visible ${actual.visibleActivities}`,
    `export evening: expected ${expected.evening}, rendered ${actual.evening}, visible ${actual.visibleEvening}`,
  ];

  expected.byDay.forEach((expectedDay, index) => {
    const actualDay = actual.byDay[index];
    if (!actualDay) {
      lines.push(`${expectedDay.date}: missing rendered day column`);
      return;
    }
    lines.push(
      `${expectedDay.date}: total ${actualDay.total}/${expectedDay.total} visible ${actualDay.visibleTotal}, afternoon ${actualDay.afternoon}/${expectedDay.afternoon} visible ${actualDay.visibleAfternoon}, evening ${actualDay.evening}/${expectedDay.evening} visible ${actualDay.visibleEvening}`
    );
  });

  return lines.join("\n");
}
