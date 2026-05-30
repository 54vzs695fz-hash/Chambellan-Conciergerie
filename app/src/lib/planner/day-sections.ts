import type { TripDay } from "../types";
import type { DaySection } from "../types";

const LEGACY_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening / Night",
};

export function parseDaySections(raw: unknown): DaySection[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    if (!raw.trim() || raw === "[]") return [];
    try {
      return normalizeSections(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return normalizeSections(raw);
  return [];
}

function normalizeSections(items: unknown[]): DaySection[] {
  return items
    .filter(
      (s): s is DaySection =>
        typeof s === "object" &&
        s !== null &&
        "id" in s &&
        "label" in s &&
        typeof (s as DaySection).id === "string"
    )
    .map((s, i) => ({
      id: s.id,
      label: s.label || "Section",
      sort_order: s.sort_order ?? i,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function serializeDaySections(sections: DaySection[]): string {
  return JSON.stringify(sections);
}

export function inferSectionsFromActivities(day: TripDay): DaySection[] {
  const seen = new Map<string, DaySection>();
  const sorted = [...day.activities].sort(
    (a, b) => a.sort_order - b.sort_order || a.time.localeCompare(b.time)
  );
  for (const act of sorted) {
    if (!seen.has(act.period)) {
      seen.set(act.period, {
        id: act.period,
        label: LEGACY_LABELS[act.period] || act.period,
        sort_order: seen.size,
      });
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.sort_order - b.sort_order);
}

export function resolveDaySections(day: TripDay): DaySection[] {
  if (day.sections.length) return day.sections;
  return inferSectionsFromActivities(day);
}

export function getVisibleSections(day: TripDay): DaySection[] {
  return resolveDaySections(day).filter((s) =>
    day.activities.some((a) => a.period === s.id)
  );
}

export function getEditableSections(day: TripDay): DaySection[] {
  return resolveDaySections(day);
}

export function createSection(label: string, sortOrder: number): DaySection {
  return {
    id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    label,
    sort_order: sortOrder,
  };
}
