import type { Trip, TripWithDays } from "../types";
import { ACTIVITY_TYPE_LABELS, EMPTY_TRIP_HEADER } from "../types";

export const PLANNER_ACTIVITY_TYPES = Object.keys(
  ACTIVITY_TYPE_LABELS
) as import("../types").ActivityType[];

export type PlannerExportVariant = "client" | "concierge";

export interface ConciergeTeamRow {
  key: "driver" | "butler" | "security" | "emergency";
  label: string;
  nameField: keyof Trip;
  phoneField?: keyof Trip;
}

export const CONCIERGE_TEAM_FIELDS: ConciergeTeamRow[] = [
  {
    key: "driver",
    label: "Driver",
    nameField: "driver_name",
    phoneField: "driver_phone",
  },
  {
    key: "butler",
    label: "Butler",
    nameField: "butler_name",
    phoneField: "butler_phone",
  },
  {
    key: "security",
    label: "Security",
    nameField: "security_contact",
  },
  {
    key: "emergency",
    label: "Emergency Contact",
    nameField: "emergency_contact",
  },
];

export interface HostStayField {
  key: "name" | "phone" | "contact" | "tailored";
  label: string;
  tripField: keyof Trip;
}

export const HOST_STAY_FIELDS: HostStayField[] = [
  {
    key: "tailored",
    label: "Number of guests / Tailored for",
    tripField: "tailored_for",
  },
  { key: "name", label: "Host name", tripField: "host_name" },
  { key: "phone", label: "Host phone", tripField: "host_phone" },
  {
    key: "contact",
    label: "Email or WhatsApp",
    tripField: "host_contact",
  },
];

export interface OptionalServiceField {
  key: string;
  label: string;
  tripField: keyof Trip;
}

export const OPTIONAL_SERVICE_FIELDS: OptionalServiceField[] = [
  { key: "hotel", label: "Hotel", tripField: "hotel" },
  { key: "villa", label: "Villa", tripField: "villa" },
  { key: "yacht", label: "Yacht", tripField: "yacht" },
  { key: "jet", label: "Jet", tripField: "jet" },
  {
    key: "restaurant_reservations",
    label: "Restaurant Reservations",
    tripField: "restaurant_reservations",
  },
  {
    key: "club_reservations",
    label: "Club Reservations",
    tripField: "club_reservations",
  },
];

export const EVENT_TRIP_FIELDS: OptionalServiceField[] = [
  { key: "event_booking", label: "Event", tripField: "event_booking" },
  { key: "event_venue", label: "Event Venue", tripField: "event_venue" },
];

/** Client-facing arrangements only (no staff or internal reservation flags) */
export const CLIENT_DOCUMENT_ARRANGEMENTS: OptionalServiceField[] = [
  { key: "hotel", label: "Hotel", tripField: "hotel" },
  { key: "villa", label: "Villa", tripField: "villa" },
  { key: "yacht", label: "Yacht", tripField: "yacht" },
  { key: "jet", label: "Jet", tripField: "jet" },
];

export function getDocumentArrangementFields(
  variant: PlannerExportVariant
): OptionalServiceField[] {
  return variant === "client"
    ? CLIENT_DOCUMENT_ARRANGEMENTS
    : OPTIONAL_SERVICE_FIELDS;
}

export function getFilledDocumentArrangements(
  trip: Trip,
  variant: PlannerExportVariant
) {
  return getDocumentArrangementFields(variant)
    .map((f) => ({
      ...f,
      value: String(trip[f.tripField] ?? "").trim(),
    }))
    .filter((s) => s.value);
}

export function getFilledConciergeTeam(trip: Trip) {
  return CONCIERGE_TEAM_FIELDS.map((row) => ({
    ...row,
    name: String(trip[row.nameField] ?? "").trim(),
    phone: row.phoneField
      ? String(trip[row.phoneField] ?? "").trim()
      : "",
  })).filter((r) => r.name || r.phone);
}

export function getFilledOptionalServices(trip: Trip) {
  return OPTIONAL_SERVICE_FIELDS.map((f) => ({
    ...f,
    value: String(trip[f.tripField] ?? "").trim(),
  })).filter((s) => s.value);
}

export function tripPayloadForApi(
  trip: TripWithDays
): Omit<Trip, "id" | "created_at" | "updated_at"> {
  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    days: _d,
    client: _cl,
    checklist: _chk,
    ...rest
  } = trip as TripWithDays & {
    days?: unknown;
    client?: unknown;
    checklist?: unknown;
  };
  return { ...EMPTY_TRIP_HEADER, ...rest };
}

export const PLANNER_FOOTER =
  "This itinerary is fully customisable and can be adjusted at any time according to your preferences. Chambellan Conciergerie remains at your disposal throughout your stay.";

/** Unified brand mark — shared by planner preview and PDF export */
export const PLANNER_BRAND_LOGO = "/brand/chambellan-logo-vertical.jpg";

export const PLANNER_DOCUMENT_SUBTITLE = "Weekly Planner";

/** Principal concierge host — shown on client itinerary footer */
export const CLIENT_ITINERARY_HOST = {
  name: "Matthieu Dubourg",
  phone: "+1 332 733 9543",
};

export interface ClientItineraryContact {
  key: string;
  label: string;
  name: string;
  phone?: string;
  detail?: string;
}

function pushContact(
  contacts: ClientItineraryContact[],
  row: {
    key: string;
    label: string;
    name: string;
    phone?: string;
    detail?: string;
  }
) {
  const name = row.name.trim();
  const phone = row.phone?.trim();
  const detail = row.detail?.trim();
  if (name || phone || detail) {
    contacts.push({
      key: row.key,
      label: row.label,
      name,
      phone: phone || undefined,
      detail: detail || undefined,
    });
  }
}

export function getClientTravelInfoIcon(key: string): string {
  switch (key) {
    case "hotel":
      return "◈";
    case "driver":
      return "◆";
    case "host":
      return "◇";
    case "butler":
      return "◦";
    case "security":
      return "▣";
    case "emergency":
      return "☎";
    default:
      return "";
  }
}

/** Guest name split for planner headers — given name(s) / surname. */
export { formatGuestName, type FormattedGuestName } from "./format-guest-name";

/** Guest count shown beneath the client name in the header (uppercase, hidden when empty). */
export function formatClientGuestCount(
  tailoredFor: string | undefined | null
): string | null {
  const trimmed = String(tailoredFor ?? "").trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

export function getClientItineraryContacts(trip: Trip): ClientItineraryContact[] {
  const contacts: ClientItineraryContact[] = [];

  pushContact(contacts, {
    key: "hotel",
    label: "Hotel",
    name: String(trip.hotel ?? ""),
  });

  pushContact(contacts, {
    key: "driver",
    label: "Driver",
    name: String(trip.driver_name ?? ""),
    phone: String(trip.driver_phone ?? ""),
  });

  pushContact(contacts, {
    key: "host",
    label: "Host",
    name: String(trip.host_name ?? "").trim() || CLIENT_ITINERARY_HOST.name,
    phone:
      String(trip.host_phone ?? "").trim() || CLIENT_ITINERARY_HOST.phone,
    detail: String(trip.host_contact ?? "").trim() || undefined,
  });

  pushContact(contacts, {
    key: "butler",
    label: "Butler",
    name: String(trip.butler_name ?? ""),
    phone: String(trip.butler_phone ?? ""),
  });

  pushContact(contacts, {
    key: "security",
    label: "Security",
    name: String(trip.security_contact ?? ""),
  });

  pushContact(contacts, {
    key: "emergency",
    label: "Emergency Contact",
    name: String(trip.emergency_contact ?? ""),
  });

  return contacts;
}
