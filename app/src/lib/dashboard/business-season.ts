export type BusinessDashboardFilter =
  | "current_season"
  | "last_season"
  | "year"
  | "custom";

export interface BusinessDateRange {
  start: string;
  end: string;
  label: string;
}

function padDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function toIsoDate(date: Date): string {
  return padDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function getCurrentSeasonRange(today = new Date()): BusinessDateRange {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const seasonYear = month <= 3 ? year - 1 : year;
  return {
    start: padDate(seasonYear, 4, 1),
    end: padDate(seasonYear, 10, 31),
    label: `Season ${seasonYear}`,
  };
}

export function getLastSeasonRange(today = new Date()): BusinessDateRange {
  const current = getCurrentSeasonRange(today);
  const seasonYear = Number.parseInt(current.start.slice(0, 4), 10) - 1;
  return {
    start: padDate(seasonYear, 4, 1),
    end: padDate(seasonYear, 10, 31),
    label: `Season ${seasonYear}`,
  };
}

export function getYearRange(today = new Date()): BusinessDateRange {
  const year = today.getFullYear();
  return {
    start: padDate(year, 1, 1),
    end: padDate(year, 12, 31),
    label: `${year}`,
  };
}

export function resolveBusinessDateRange(
  filter: BusinessDashboardFilter,
  customStart?: string,
  customEnd?: string,
  today = new Date()
): BusinessDateRange | null {
  switch (filter) {
    case "current_season":
      return getCurrentSeasonRange(today);
    case "last_season":
      return getLastSeasonRange(today);
    case "year":
      return getYearRange(today);
    case "custom": {
      const start = customStart?.trim() ?? "";
      const end = customEnd?.trim() ?? "";
      if (!start || !end || start > end) return null;
      return { start, end, label: `${start} – ${end}` };
    }
    default:
      return getCurrentSeasonRange(today);
  }
}

export function isDateWithinRange(
  date: string,
  range: BusinessDateRange
): boolean {
  const value = date.trim();
  if (!value) return false;
  return value >= range.start && value <= range.end;
}

export const BUSINESS_DASHBOARD_FILTER_LABELS: Record<
  BusinessDashboardFilter,
  string
> = {
  current_season: "Current season",
  last_season: "Last season",
  year: "Year",
  custom: "Custom dates",
};
