const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatDayHeading(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  const day = WEEKDAYS[d.getDay()].toUpperCase();
  const num = d.getDate();
  const month = MONTHS[d.getMonth()].toUpperCase();
  return `${day} · ${num} ${month}`;
}

/** Column header — day name (e.g. MONDAY) */
export function formatGridDayName(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return WEEKDAYS[d.getDay()].toUpperCase();
}

/** Column header — compact date (e.g. 28/07) */
export function formatGridDayDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

/** Client day column — editorial date (e.g. 28 MAY) */
export function formatLuxuryDayDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()].toUpperCase()}`;
}

export function formatDateRange(arrival: string, departure: string): string {
  if (!arrival || !departure) return "";
  const a = new Date(arrival + "T12:00:00");
  const b = new Date(departure + "T12:00:00");
  const fmt = (d: Date) =>
    `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (arrival === departure) return fmt(a);
  return `${fmt(a)} – ${fmt(b)}`;
}

export function isUntitledDestination(destination: string): boolean {
  const trimmed = destination.trim();
  return !trimmed || trimmed === "Untitled destination";
}

/** Client header — stacked travel dates (left column) */
export function formatHeaderTravelDates(
  arrival: string,
  departure: string
): { start: string; end: string | null } {
  const fmt = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return `${d.getDate()} ${MONTHS[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
  };

  if (arrival && departure) {
    if (arrival === departure) {
      return { start: fmt(arrival), end: null };
    }
    return { start: fmt(arrival), end: fmt(departure) };
  }
  if (arrival) return { start: fmt(arrival), end: null };
  if (departure) return { start: fmt(departure), end: null };
  return { start: "", end: null };
}

/** Shorter range for PDF header */
export function formatDateRangeCompact(
  arrival: string,
  departure: string
): string {
  if (!arrival || !departure) return "";
  const a = new Date(arrival + "T12:00:00");
  const b = new Date(departure + "T12:00:00");
  const short = (d: Date) =>
    `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  if (arrival === departure) return short(a);
  return `${short(a)} – ${short(b)}`;
}

export function formatTimeDisplay(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

const LATE_NIGHT_END_HOUR = 5;
const MINUTES_PER_DAY = 24 * 60;

/** Evening / Night sections treat 00:00–05:59 as after 23:59. */
export function isEveningNightSection(
  periodId: string,
  sectionLabel = ""
): boolean {
  const safePeriodId = String(periodId ?? "");
  const normalized = String(sectionLabel ?? "").trim().toLowerCase();
  if (safePeriodId === "evening") return true;
  return (
    normalized.includes("evening") ||
    normalized.includes("night") ||
    normalized.includes("dinner") ||
    (normalized.includes("club") && !normalized.includes("beach"))
  );
}

export function activityTimeSortKey(
  time: string,
  options?: { eveningSection?: boolean }
): number {
  const safeTime = String(time ?? "").trim();
  if (!safeTime) return Number.MAX_SAFE_INTEGER;
  const [hRaw, mRaw] = safeTime.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return Number.MAX_SAFE_INTEGER;

  let minutes = h * 60 + m;
  if (options?.eveningSection && h >= 0 && h <= LATE_NIGHT_END_HOUR) {
    minutes += MINUTES_PER_DAY;
  }

  return minutes;
}

function safeSortOrder(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeActivityId(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function sortActivitiesByTime<
  T extends { time: string; sort_order: number; id: number },
>(activities: T[], options?: { eveningSection?: boolean }): T[] {
  try {
    const list = Array.isArray(activities)
      ? activities.filter((activity): activity is T => Boolean(activity))
      : [];
    return [...list].sort(
      (a, b) =>
        activityTimeSortKey(a.time, options) -
          activityTimeSortKey(b.time, options) ||
        safeSortOrder(a.sort_order) - safeSortOrder(b.sort_order) ||
        safeActivityId(a.id) - safeActivityId(b.id)
    );
  } catch {
    return Array.isArray(activities) ? [...activities] : [];
  }
}

export function sortActivitiesForSection<
  T extends { time: string; sort_order: number; id: number },
>(activities: T[], periodId: string, sectionLabel = ""): T[] {
  try {
    return sortActivitiesByTime(activities, {
      eveningSection: isEveningNightSection(
        String(periodId ?? ""),
        String(sectionLabel ?? "")
      ),
    });
  } catch {
    return Array.isArray(activities) ? [...activities] : [];
  }
}

export function formatDayShort(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return `${WEEKDAYS_SHORT[d.getDay()]} ${formatGridDayDate(dateStr)}`;
}

export function itineraryCategorySlug(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "activity"
  );
}

/** Generic operational notes hidden from the client itinerary */
export function isGenericActivityNote(detail: string): boolean {
  const d = detail.trim();
  if (!d) return true;
  if (/^confirmed\.?$/i.test(d)) return true;
  if (/^reservation confirmed\.?$/i.test(d)) return true;
  if (/^reservation confirmed for \d+ guests?\.?$/i.test(d)) return true;
  if (/^club reservation confirmed\.?$/i.test(d)) return true;
  if (/^guest list confirmed\.?$/i.test(d)) return true;
  if (/^vip table confirmed\.?$/i.test(d)) return true;
  if (/^table confirmed\.?$/i.test(d)) return true;
  if (/^vip (?:access|entry|pass) confirmed\.?$/i.test(d)) return true;
  if (/^awaiting confirmation\.?$/i.test(d)) return true;
  if (/^pending confirmation\.?$/i.test(d)) return true;
  if (/^tbc\.?$/i.test(d)) return true;
  if (/^to be confirmed\.?$/i.test(d)) return true;
  if (/^internal note/i.test(d)) return true;
  if (/^concierge note/i.test(d)) return true;
  if (/^operational/i.test(d)) return true;
  return false;
}

/** True when label already begins with a pictograph-style character */
function startsWithEmoji(text: string): boolean {
  const cp = text.codePointAt(0);
  if (cp === undefined) return false;
  return (
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x2600 && cp <= 0x27bf) ||
    cp === 0x2714 ||
    cp === 0x2728 ||
    cp === 0xfe0f
  );
}

/** Luxury itinerary section heading — emoji + label for client document */
export function formatItinerarySectionTitle(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "Activity";
  if (startsWithEmoji(trimmed)) return trimmed;

  const slug = itineraryCategorySlug(trimmed);
  const normalized = trimmed.toLowerCase();

  switch (slug) {
    case "lunch":
      return "🍴 Lunch";
    case "brunch":
      return "🍴 Brunch";
    case "dinner":
      return "🍽 Dinner";
    case "club":
      return "🌙 Night";
    case "beach-club":
      return "🏖 Beach Club";
    case "paddock":
    case "grand-prix":
      return "🏁 Grand Prix";
    case "activity":
    case "excursion":
      return "✦ Activity";
    case "transfer":
      return "➝ Transfer";
    case "departure":
      return "➝ Departure";
    default:
      break;
  }

  if (
    normalized.includes("restaurant") ||
    normalized.includes("lunch") ||
    normalized.includes("brunch")
  ) {
    return `🍴 ${trimmed}`;
  }
  if (normalized.includes("dinner")) return `🍽 ${trimmed}`;
  if (normalized.includes("beach")) return `🏖 ${trimmed}`;
  if (normalized.includes("club") && !normalized.includes("beach")) {
    return `🌙 ${trimmed}`;
  }
  if (
    normalized.includes("paddock") ||
    normalized.includes("grand prix") ||
    normalized.includes("formula")
  ) {
    return `🏁 ${trimmed}`;
  }
  if (normalized.includes("transfer") || normalized.includes("departure")) {
    return `➝ ${trimmed}`;
  }
  return trimmed;
}

/** Discreet monochrome symbol for client itinerary activities */
export function itineraryActivityIcon(sectionLabel: string): string | null {
  const slug = itineraryCategorySlug(sectionLabel);
  switch (slug) {
    case "lunch":
    case "brunch":
    case "dinner":
      return "✦";
    case "beach-club":
      return "◈";
    case "club":
      return "◆";
    case "paddock":
    case "grand-prix":
    case "activity":
    case "excursion":
      return "◉";
    case "transfer":
    case "departure":
      return "➝";
    default: {
      const normalized = sectionLabel.trim().toLowerCase();
      if (
        normalized.includes("restaurant") ||
        normalized.includes("lunch") ||
        normalized.includes("dinner") ||
        normalized.includes("brunch")
      ) {
        return "✦";
      }
      if (normalized.includes("beach")) return "◈";
      if (normalized.includes("club")) return "◆";
      if (
        normalized.includes("paddock") ||
        normalized.includes("grand prix") ||
        normalized.includes("excursion")
      ) {
        return "◉";
      }
      if (normalized.includes("transfer") || normalized.includes("departure")) {
        return "➝";
      }
      return null;
    }
  }
}

/** Concierge itinerary slot order — consistent across all days */
const ITINERARY_SECTION_ORDER: Record<string, number> = {
  lunch: 10,
  brunch: 10,
  "beach-club": 20,
  activity: 30,
  excursion: 30,
  paddock: 30,
  "grand-prix": 30,
  dinner: 40,
  club: 50,
  transfer: 60,
  departure: 60,
};

export function itinerarySectionSortKey(label: string): number {
  const slug = itineraryCategorySlug(label);
  if (slug in ITINERARY_SECTION_ORDER) {
    return ITINERARY_SECTION_ORDER[slug];
  }
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("beach")) return 20;
  if (
    normalized.includes("paddock") ||
    normalized.includes("excursion") ||
    normalized.includes("activity") ||
    normalized.includes("grand prix")
  ) {
    return 30;
  }
  if (normalized.includes("transfer") || normalized.includes("departure")) {
    return 60;
  }
  return 45;
}

export function sortSectionsByItineraryOrder<
  T extends { label: string; sort_order?: number },
>(sections: T[]): T[] {
  return [...sections].sort(
    (a, b) =>
      itinerarySectionSortKey(a.label) - itinerarySectionSortKey(b.label) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
}

export type LuxuryDisplayPeriod = "afternoon" | "evening";

export const LUXURY_ITINERARY_PERIOD_TITLES: Record<
  LuxuryDisplayPeriod,
  string
> = {
  afternoon: "Afternoon",
  evening: "Evening / Night",
};

export const LUXURY_DISPLAY_PERIOD_ORDER: LuxuryDisplayPeriod[] = [
  "afternoon",
  "evening",
];

/** Map planner section labels to Afternoon / Evening display slots */
export function getLuxuryDisplayPeriod(
  sectionLabel: string,
  time = "",
  sectionId = ""
): LuxuryDisplayPeriod {
  const safeLabel = String(sectionLabel ?? "");
  const safeSectionId = String(sectionId ?? "");
  const safeTime = String(time ?? "");

  if (safeSectionId && isEveningNightSection(safeSectionId, safeLabel)) {
    return "evening";
  }

  const slug = itineraryCategorySlug(safeLabel);
  const normalized = safeLabel.trim().toLowerCase();

  if (slug === "dinner" || slug === "club") return "evening";
  if (normalized.includes("evening") || normalized.includes("night")) {
    return "evening";
  }
  if (
    normalized.includes("dinner") ||
    (normalized.includes("club") && !normalized.includes("beach"))
  ) {
    return "evening";
  }

  if (slug === "departure" || slug === "transfer") {
    if (
      safeTime &&
      activityTimeSortKey(safeTime, { eveningSection: true }) >= 17 * 60
    ) {
      return "evening";
    }
    return "afternoon";
  }

  if (normalized.includes("afternoon") || normalized.includes("morning")) {
    return "afternoon";
  }

  return "afternoon";
}

export interface LuxuryItineraryActivity<T extends { time: string }> {
  activity: T;
  sectionLabel: string;
  sectionId?: string;
}

export function groupActivitiesByLuxuryPeriod<T extends { time: string }>(
  items: LuxuryItineraryActivity<T>[]
): Map<LuxuryDisplayPeriod, LuxuryItineraryActivity<T>[]> {
  const groups = new Map<LuxuryDisplayPeriod, LuxuryItineraryActivity<T>[]>(
    LUXURY_DISPLAY_PERIOD_ORDER.map((p) => [p, []])
  );

  for (const item of items) {
    if (!item?.activity) continue;
    const period = getLuxuryDisplayPeriod(
      item.sectionLabel,
      item.activity.time ?? "",
      item.sectionId ?? ""
    );
    groups.get(period)!.push(item);
  }

  return groups;
}

export function sortLuxuryItineraryActivities<
  T extends { time: string; sort_order: number; id: number },
>(
  items: LuxuryItineraryActivity<T>[],
  period: LuxuryDisplayPeriod
): LuxuryItineraryActivity<T>[] {
  try {
    const list = Array.isArray(items)
      ? items.filter((item): item is LuxuryItineraryActivity<T> =>
          Boolean(item?.activity)
        )
      : [];
    const eveningSection = period === "evening";
    return [...list].sort(
      (a, b) =>
        activityTimeSortKey(a.activity.time, { eveningSection }) -
          activityTimeSortKey(b.activity.time, { eveningSection }) ||
        safeSortOrder(a.activity.sort_order) -
          safeSortOrder(b.activity.sort_order) ||
        safeActivityId(a.activity.id) - safeActivityId(b.activity.id)
    );
  } catch {
    return Array.isArray(items) ? [...items] : [];
  }
}

/** Tertiary category line on client travel cards (e.g. Lunch, Dinner) */
export function formatItineraryCategoryLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "";
  const cleaned = trimmed.replace(/^[^A-Za-z0-9]+/, "").trim();
  return cleaned || trimmed;
}

/** Editorial title case for client itinerary category lines */
function editorialCategoryLabel(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Gold luxury glyph + label for activity category lines */
export function getLuxuryCategoryDisplay(label: string): {
  icon: string;
  label: string;
} {
  const cleaned = formatItineraryCategoryLabel(label);
  if (!cleaned) return { icon: "", label: "" };

  const slug = itineraryCategorySlug(label);
  const normalized = label.trim().toLowerCase();

  if (slug === "beach-club" || normalized.includes("beach")) {
    return { icon: "◈", label: "Beach Club" };
  }
  if (
    slug === "paddock" ||
    slug === "grand-prix" ||
    normalized.includes("grand prix") ||
    normalized.includes("formula") ||
    normalized.includes("paddock")
  ) {
    return { icon: "◎", label: "Grand Prix" };
  }
  if (slug === "dinner" || normalized.includes("dinner")) {
    return { icon: "◆", label: "Dinner" };
  }
  if (
    slug === "club" ||
    (normalized.includes("club") && !normalized.includes("beach")) ||
    normalized.includes("night")
  ) {
    return { icon: "◇", label: editorialCategoryLabel(cleaned) };
  }
  if (slug === "departure" || normalized.includes("departure")) {
    return { icon: "→", label: "Departure" };
  }
  if (slug === "transfer" || normalized.includes("transfer")) {
    return { icon: "→", label: editorialCategoryLabel(cleaned) };
  }
  if (slug === "lunch" || normalized.includes("lunch")) {
    return { icon: "◦", label: "Lunch" };
  }
  if (slug === "brunch" || normalized.includes("brunch")) {
    return { icon: "◦", label: "Brunch" };
  }
  return { icon: "◦", label: editorialCategoryLabel(cleaned) };
}
