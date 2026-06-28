import type { Activity, BookingStatus } from "@/lib/types";

const VALID_BOOKING_STATUSES = new Set<BookingStatus>([
  "to_request",
  "request_sent",
  "waiting_confirmation",
  "confirmed",
  "paid",
  "rejected",
  "cancelled",
]);

function normalizePartStatus(value: unknown, fallback: BookingStatus): BookingStatus {
  if (
    typeof value === "string" &&
    VALID_BOOKING_STATUSES.has(value as BookingStatus)
  ) {
    return value as BookingStatus;
  }
  return fallback;
}

export type BeachClubBookingPart = "sunbeds" | "lunch";

export interface NormalizedBeachClubOptions {
  sunbedsEnabled: boolean;
  sunbedsTime: string;
  lunchEnabled: boolean;
  lunchTime: string;
  sunbedsStatus: BookingStatus;
  lunchStatus: BookingStatus;
}

export interface BeachClubDisplayEntry {
  part: BeachClubBookingPart;
  label: string;
  icon: string;
  time: string;
}

export function isBeachClubActivity(
  activity: Pick<Activity, "activity_type">
): boolean {
  return activity.activity_type === "beach_club";
}

export function normalizeBeachClubActivity(
  activity: Activity
): NormalizedBeachClubOptions {
  const explicitSunbeds = Boolean(activity.beach_sunbeds);
  const explicitLunch = Boolean(activity.beach_lunch);
  const legacyTime = activity.time?.trim() ?? "";

  let sunbedsEnabled = explicitSunbeds;
  let lunchEnabled = explicitLunch;
  let sunbedsTime = activity.beach_sunbeds_time?.trim() ?? "";
  let lunchTime = activity.beach_lunch_time?.trim() ?? "";

  if (!explicitSunbeds && !explicitLunch && legacyTime) {
    lunchEnabled = true;
    lunchTime = legacyTime;
  }

  return {
    sunbedsEnabled,
    sunbedsTime,
    lunchEnabled,
    lunchTime,
    sunbedsStatus: normalizePartStatus(
      activity.beach_sunbeds_status,
      normalizePartStatus(activity.booking_status, "to_request")
    ),
    lunchStatus: normalizePartStatus(
      activity.beach_lunch_status,
      normalizePartStatus(activity.booking_status, "to_request")
    ),
  };
}

export function getBeachClubDisplayEntries(
  activity: Activity
): BeachClubDisplayEntry[] {
  if (!isBeachClubActivity(activity)) return [];

  const options = normalizeBeachClubActivity(activity);
  const entries: BeachClubDisplayEntry[] = [];

  if (options.sunbedsEnabled) {
    entries.push({
      part: "sunbeds",
      label: "Sunbeds",
      icon: "◌",
      time: options.sunbedsTime,
    });
  }

  if (options.lunchEnabled) {
    entries.push({
      part: "lunch",
      label: "Lunch",
      icon: "◆",
      time: options.lunchTime,
    });
  }

  return entries;
}

export function getActivityPrimaryTime(activity: Activity): string {
  if (!isBeachClubActivity(activity)) {
    return activity.time?.trim() ?? "";
  }

  const options = normalizeBeachClubActivity(activity);
  const times = [
    options.sunbedsEnabled ? options.sunbedsTime : "",
    options.lunchEnabled ? options.lunchTime : "",
  ].filter(Boolean);

  if (times.length === 0) return activity.time?.trim() ?? "";
  return [...times].sort()[0];
}

export function activityHasDisplayContent(activity: Activity): boolean {
  const hasTitleOrDetails =
    Boolean(activity.title?.trim()) || Boolean(activity.details?.trim());

  if (!isBeachClubActivity(activity)) {
    return Boolean(
      activity.time?.trim() || hasTitleOrDetails
    );
  }

  const options = normalizeBeachClubActivity(activity);
  return (
    hasTitleOrDetails ||
    options.sunbedsEnabled ||
    options.lunchEnabled
  );
}

export function reservationItemKey(
  activityId: number,
  part?: BeachClubBookingPart | null
): string {
  return part ? `${activityId}:${part}` : String(activityId);
}

export function parseReservationItemKey(itemKey: string): {
  activityId: number;
  beachClubPart: BeachClubBookingPart | null;
} {
  const [idPart, part] = itemKey.split(":");
  const activityId = Number(idPart);
  if (part === "sunbeds" || part === "lunch") {
    return { activityId, beachClubPart: part };
  }
  return { activityId, beachClubPart: null };
}

export function buildActivityPatchFromReservationItem(
  item: Pick<ReservationStatusItemShape, "activityId" | "beachClubPart">,
  patch: Partial<{
    booking_status: BookingStatus;
    assigned_to: string;
    booking_notes: string;
  }>
): Partial<Activity> {
  const result: Partial<Activity> = {};

  if (patch.assigned_to !== undefined) {
    result.assigned_to = patch.assigned_to;
  }
  if (patch.booking_notes !== undefined) {
    result.booking_notes = patch.booking_notes;
  }

  if (item.beachClubPart === "sunbeds") {
    if (patch.booking_status !== undefined) {
      result.beach_sunbeds_status = patch.booking_status;
    }
    return result;
  }

  if (item.beachClubPart === "lunch") {
    if (patch.booking_status !== undefined) {
      result.beach_lunch_status = patch.booking_status;
    }
    return result;
  }

  if (patch.booking_status !== undefined) {
    result.booking_status = patch.booking_status;
  }

  return result;
}

export interface ReservationStatusItemShape {
  activityId: number;
  beachClubPart?: BeachClubBookingPart | null;
  itemKey: string;
}

export function syncBeachClubPersistedFields(
  activity: Partial<Activity>
): Partial<Activity> {
  if (activity.activity_type !== "beach_club") return activity;

  const normalized = normalizeBeachClubActivity({
    ...activity,
    id: activity.id ?? 0,
    trip_day_id: activity.trip_day_id ?? 0,
    period: activity.period ?? "",
    activity_type: "beach_club",
    time: activity.time ?? "",
    title: activity.title ?? "",
    details: activity.details ?? "",
    status: activity.status ?? "confirmed",
    booking_status: activity.booking_status ?? "to_request",
    assigned_to: activity.assigned_to ?? "",
    booking_notes: activity.booking_notes ?? "",
    sort_order: activity.sort_order ?? 0,
    establishment_city: activity.establishment_city ?? "",
    beach_sunbeds: activity.beach_sunbeds ?? false,
    beach_sunbeds_time: activity.beach_sunbeds_time ?? "",
    beach_lunch: activity.beach_lunch ?? false,
    beach_lunch_time: activity.beach_lunch_time ?? "",
    beach_sunbeds_status: activity.beach_sunbeds_status ?? "to_request",
    beach_lunch_status: activity.beach_lunch_status ?? "to_request",
    transport_type: activity.transport_type ?? "",
    transport_pickup: activity.transport_pickup ?? "",
    transport_destination: activity.transport_destination ?? "",
  });

  return {
    ...activity,
    beach_sunbeds: normalized.sunbedsEnabled,
    beach_sunbeds_time: normalized.sunbedsTime,
    beach_lunch: normalized.lunchEnabled,
    beach_lunch_time: normalized.lunchTime,
    time: getActivityPrimaryTime({
      ...activity,
      activity_type: "beach_club",
      beach_sunbeds: normalized.sunbedsEnabled,
      beach_sunbeds_time: normalized.sunbedsTime,
      beach_lunch: normalized.lunchEnabled,
      beach_lunch_time: normalized.lunchTime,
    } as Activity),
  };
}

export function beachClubCategoryLabel(part: BeachClubBookingPart): string {
  return part === "sunbeds" ? "Beach Club · Sunbeds" : "Beach Club · Lunch";
}
