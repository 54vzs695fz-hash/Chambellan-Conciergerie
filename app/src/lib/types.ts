export type ActivityType =
  | "restaurant"
  | "beach_club"
  | "club"
  | "activity"
  | "transfer"
  | "note";

export type ActivityPeriod = string;

export interface DaySection {
  id: string;
  label: string;
  sort_order: number;
}

export type ActivityStatus = "confirmed" | "awaiting";

export interface Client {
  id: number;
  full_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  nationality: string;
  notes: string;
  preferences: string;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: number;
  client_id: number | null;
  client_name: string;
  destination: string;
  arrival_date: string;
  departure_date: string;
  /** @deprecated legacy — use driver_name */
  hotel: string;
  /** @deprecated legacy — use villa fields if needed */
  villa: string;
  /** @deprecated legacy — migrated to driver_name */
  driver: string;
  /** @deprecated legacy — migrated to butler_name */
  butler: string;
  /** @deprecated legacy — migrated to security_contact */
  security: string;
  notes: string;
  driver_name: string;
  driver_phone: string;
  butler_name: string;
  butler_phone: string;
  security_contact: string;
  emergency_contact: string;
  yacht: string;
  jet: string;
  restaurant_reservations: string;
  club_reservations: string;
  host_name: string;
  host_phone: string;
  host_contact: string;
  tailored_for: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  trip_day_id: number;
  period: ActivityPeriod;
  activity_type: ActivityType;
  time: string;
  title: string;
  details: string;
  status: ActivityStatus;
  sort_order: number;
}

export interface TripDay {
  id: number;
  trip_id: number;
  date: string;
  sections: DaySection[];
  activities: Activity[];
}

export interface TripWithDays extends Trip {
  days: TripDay[];
  client?: Client | null;
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  restaurant: "Restaurant",
  beach_club: "Beach Club",
  club: "Club",
  activity: "Activity",
  transfer: "Transfer",
  note: "Notes",
};

export const EMPTY_CLIENT: Omit<Client, "id" | "created_at" | "updated_at"> = {
  full_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  nationality: "",
  notes: "",
  preferences: "",
};

export const EMPTY_TRIP_HEADER: Omit<
  Trip,
  "id" | "created_at" | "updated_at"
> = {
  client_id: null,
  client_name: "",
  destination: "",
  arrival_date: "",
  departure_date: "",
  hotel: "",
  villa: "",
  driver: "",
  butler: "",
  security: "",
  notes: "",
  driver_name: "",
  driver_phone: "",
  butler_name: "",
  butler_phone: "",
  security_contact: "",
  emergency_contact: "",
  yacht: "",
  jet: "",
  restaurant_reservations: "",
  club_reservations: "",
  host_name: "Matthieu Dubourg",
  host_phone: "+1 332 733 9543",
  host_contact: "",
  tailored_for: "",
};
