import type { Activity, TripDay, TripWithDays } from "@/lib/types";
import { getVisibleSections } from "@/lib/planner/day-sections";
import type { PlannerExportVariant } from "@/lib/planner/planner-sheet-model";
import { sortSectionsByItineraryOrder } from "@/lib/planner-utils";

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

export interface PlannerExportManifest {
  variant: PlannerExportVariant;
  days: number;
  dayColumns: number;
  activities: number;
  sections: number;
  notes: number;
  team: number;
  stayContacts: number;
}

export function getPlannerExportManifest(
  trip: TripWithDays,
  variant: PlannerExportVariant,
  stayContactCount = 0,
  teamCount = 0
): PlannerExportManifest {
  let dayColumns = 0;
  let activities = 0;
  let sections = 0;

  for (const day of trip.days) {
    const dayActivities = visibleActivitiesForDay(day);
    if (dayActivities.length === 0) continue;

    dayColumns += 1;
    activities += dayActivities.length;
    sections += orderedActiveSections(day).length;
  }

  return {
    variant,
    days: trip.days.length,
    dayColumns,
    activities,
    sections,
    notes: variant === "concierge" && Boolean(trip.notes?.trim()) ? 1 : 0,
    team: variant === "concierge" ? teamCount : 0,
    stayContacts: stayContactCount,
  };
}

export interface PlannerExportDomCounts {
  dayColumns: number;
  activities: number;
  sections: number;
  notes: number;
  team: number;
  stayContacts: number;
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
    };
  }

  if (variant === "client") {
    return {
      dayColumns: root.querySelectorAll(".lux-day-card").length,
      activities: root.querySelectorAll(".lux-travel-card").length,
      sections: root.querySelectorAll(".lux-period-block").length,
      notes: 0,
      team: 0,
      stayContacts: root.querySelectorAll(".lux-travel-info-item").length,
    };
  }

  return {
    dayColumns: root.querySelectorAll(".lux-day-column").length,
    activities: root.querySelectorAll(".lux-activity-card--itinerary").length,
    sections: root.querySelectorAll(".lux-itinerary-block").length,
    notes: root.querySelectorAll(".lux-notes-text").length,
    team: root.querySelectorAll(".lux-team-card").length,
    stayContacts: root.querySelectorAll(".lux-travel-info-item").length,
  };
}

export function plannerExportDomMatchesManifest(
  expected: PlannerExportManifest,
  actual: PlannerExportDomCounts
): boolean {
  return (
    actual.dayColumns === expected.dayColumns &&
    actual.activities === expected.activities &&
    actual.sections === expected.sections &&
    actual.notes === expected.notes &&
    actual.team === expected.team &&
    actual.stayContacts === expected.stayContacts
  );
}
