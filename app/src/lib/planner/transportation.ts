import type { Activity, ActivityType, BookingStatus } from "@/lib/types";

export type TransportType =
  | "van"
  | "luxury_sedan"
  | "helicopter"
  | "boat_transfer"
  | "tender"
  | "walking_escort"
  | "other";

export const TRANSPORT_TYPE_OPTIONS: TransportType[] = [
  "van",
  "luxury_sedan",
  "helicopter",
  "boat_transfer",
  "tender",
  "walking_escort",
  "other",
];

export const TRANSPORT_TYPE_LABELS: Record<TransportType, string> = {
  van: "Van",
  luxury_sedan: "Luxury Sedan",
  helicopter: "Helicopter",
  boat_transfer: "Boat Transfer",
  tender: "Tender",
  walking_escort: "Walking Escort",
  other: "Other",
};

export const TRANSPORTATION_BOOKING_STATUS_OPTIONS = [
  "to_request",
  "request_sent",
  "waiting_confirmation",
  "confirmed",
] as const satisfies readonly BookingStatus[];

export const TRANSPORTATION_BOOKING_STATUS_LABELS: Record<
  (typeof TRANSPORTATION_BOOKING_STATUS_OPTIONS)[number],
  string
> = {
  to_request: "To arrange",
  request_sent: "Request sent",
  waiting_confirmation: "Waiting confirmation",
  confirmed: "Confirmed",
};

export function transportTypeAutoTitle(type: TransportType): string {
  switch (type) {
    case "helicopter":
      return "HELICOPTER TRANSFER";
    case "boat_transfer":
      return "BOAT TRANSFER";
    case "tender":
      return "TENDER TRANSFER";
    case "walking_escort":
      return "ESCORT";
    case "van":
    case "luxury_sedan":
    case "other":
    default:
      return "PRIVATE TRANSFER";
  }
}

/** Client PDF heading — concise transfer label. */
export function resolveTransportPdfHeading(
  transport: NormalizedTransportation
): string {
  const legacy = transport.displayTitle.trim();
  if (legacy && !AUTO_TITLES.has(legacy)) {
    return legacy.toUpperCase();
  }

  switch (transport.transportType) {
    case "helicopter":
      return "HELICOPTER TRANSFER";
    case "boat_transfer":
      return "BOAT TRANSFER";
    case "tender":
      return "TENDER TRANSFER";
    case "walking_escort":
      return "ESCORT";
    case "luxury_sedan":
    case "van":
    case "other":
    default:
      return "TRANSFER";
  }
}

export function transportPdfIcon(type: TransportType): string {
  switch (type) {
    case "helicopter":
      return "🚁";
    case "boat_transfer":
    case "tender":
      return "🚤";
    case "walking_escort":
      return "🚶";
    default:
      return "🚐";
  }
}

export function formatTransportRouteLine(
  pickup: string,
  destination: string
): string | null {
  const from = pickup.trim();
  const to = destination.trim();
  if (from && to) return `${from} → ${to}`;
  if (from) return from;
  if (to) return to;
  return null;
}

/** Optional vehicle label when it adds detail beyond the heading. */
export function resolveTransportPdfVehicleLabel(
  transport: NormalizedTransportation,
  heading: string
): string | null {
  if (!transport.hasExplicitType) return null;

  const label = transport.typeLabel.trim();
  if (!label || label === "Van" || label === "Other") return null;

  const headingUpper = heading.toUpperCase();
  if (headingUpper.includes(label.toUpperCase())) return null;
  if (label === "Helicopter" && headingUpper.includes("HELICOPTER")) return null;
  if (label === "Boat Transfer" && headingUpper.includes("BOAT")) return null;

  return label;
}

const AUTO_TITLES = new Set(
  TRANSPORT_TYPE_OPTIONS.map((type) => transportTypeAutoTitle(type))
);

export function normalizeActivityType(type: string): ActivityType {
  if (type === "transfer") return "transportation";
  return type as ActivityType;
}

export function isTransportationActivity(
  activity: Pick<Activity, "activity_type">
): boolean {
  const type = activity.activity_type as string;
  return type === "transportation" || type === "transfer";
}

export function normalizeTransportType(value: unknown): TransportType {
  if (
    typeof value === "string" &&
    TRANSPORT_TYPE_OPTIONS.includes(value as TransportType)
  ) {
    return value as TransportType;
  }
  return "van";
}

export interface NormalizedTransportation {
  transportType: TransportType;
  pickup: string;
  destination: string;
  displayTitle: string;
  typeLabel: string;
  hasExplicitType: boolean;
}

export function normalizeTransportationActivity(
  activity: Activity
): NormalizedTransportation {
  const hasExplicitType = Boolean(activity.transport_type?.trim());
  const transportType = normalizeTransportType(activity.transport_type);
  const pickup = activity.transport_pickup?.trim() ?? "";
  const destination = activity.transport_destination?.trim() ?? "";
  const autoTitle = transportTypeAutoTitle(transportType);
  const legacyTitle = activity.title?.trim() ?? "";

  let displayTitle = autoTitle;
  if (!hasExplicitType && legacyTitle && !AUTO_TITLES.has(legacyTitle)) {
    displayTitle = legacyTitle;
  }

  return {
    transportType,
    pickup,
    destination,
    displayTitle,
    typeLabel: TRANSPORT_TYPE_LABELS[transportType],
    hasExplicitType,
  };
}

export function activityHasTransportDisplayContent(activity: Activity): boolean {
  if (!isTransportationActivity(activity)) return false;

  const options = normalizeTransportationActivity(activity);
  return (
    Boolean(options.displayTitle) ||
    Boolean(options.pickup) ||
    Boolean(options.destination) ||
    Boolean(activity.time?.trim()) ||
    options.hasExplicitType
  );
}

export function syncTransportationPersistedFields(
  activity: Partial<Activity>
): Partial<Activity> {
  const type = activity.activity_type as string;
  if (type !== "transportation" && type !== "transfer") {
    return activity;
  }

  const normalized = normalizeTransportationActivity({
    ...activity,
    id: activity.id ?? 0,
    trip_day_id: activity.trip_day_id ?? 0,
    period: activity.period ?? "",
    activity_type: "transportation",
    time: activity.time ?? "",
    title: activity.title ?? "",
    details: activity.details ?? "",
    status: activity.status ?? "confirmed",
    booking_status: activity.booking_status ?? "to_request",
    assigned_to: activity.assigned_to ?? "",
    booking_notes: activity.booking_notes ?? "",
    sort_order: activity.sort_order ?? 0,
    establishment_city: activity.establishment_city ?? "",
    transport_type: activity.transport_type ?? "",
    transport_pickup: activity.transport_pickup ?? "",
    transport_destination: activity.transport_destination ?? "",
    beach_sunbeds: activity.beach_sunbeds ?? false,
    beach_sunbeds_time: activity.beach_sunbeds_time ?? "",
    beach_lunch: activity.beach_lunch ?? false,
    beach_lunch_time: activity.beach_lunch_time ?? "",
    beach_sunbeds_status: activity.beach_sunbeds_status ?? "to_request",
    beach_lunch_status: activity.beach_lunch_status ?? "to_request",
  });

  const shouldAutoTitle =
    activity.transport_type !== undefined ||
    type === "transportation" ||
    type === "transfer";

  return {
    ...activity,
    activity_type: "transportation",
    transport_type: activity.transport_type ?? normalized.transportType,
    title: shouldAutoTitle ? normalized.displayTitle : activity.title,
  };
}

export function transportationBookingStatusLabel(
  status: BookingStatus
): string {
  if (status === "to_request") {
    return TRANSPORTATION_BOOKING_STATUS_LABELS.to_request;
  }
  if (status === "request_sent") {
    return TRANSPORTATION_BOOKING_STATUS_LABELS.request_sent;
  }
  if (status === "waiting_confirmation") {
    return TRANSPORTATION_BOOKING_STATUS_LABELS.waiting_confirmation;
  }
  if (status === "confirmed") {
    return TRANSPORTATION_BOOKING_STATUS_LABELS.confirmed;
  }
  if (status === "cancelled" || status === "rejected") {
    return "Cancelled";
  }
  return TRANSPORTATION_BOOKING_STATUS_LABELS.to_request;
}
