export type ActivityType =
  | "restaurant"
  | "beach_club"
  | "club"
  | "activity"
  | "event"
  | "transfer"
  | "note";

export type ActivityPeriod = string;

export interface DaySection {
  id: string;
  label: string;
  sort_order: number;
}

export type ActivityStatus = "confirmed" | "awaiting";

export type TripFollowUpStatus =
  | "follow_up"
  | "contacted"
  | "confirmed"
  | "completed";

export type TripPaymentStatus =
  | "pending"
  | "deposit_paid"
  | "fully_paid"
  | "cancelled";

export type TripPaymentMethod =
  | "stripe"
  | "paypal"
  | "revolut"
  | "bank_transfer"
  | "cash"
  | "other";

export type ChecklistItemStatus = "todo" | "in_progress" | "done";

export type ChecklistCategory =
  | "programme"
  | "reservations"
  | "transport"
  | "accommodation"
  | "payments"
  | "concierge_services"
  | "arrival"
  | "during_stay"
  | "departure";

export interface ChecklistItem {
  id: number;
  trip_id: number;
  category: ChecklistCategory;
  title: string;
  status: ChecklistItemStatus;
  notes: string;
  due_date: string;
  reminder_date: string;
  sort_order: number;
}

export interface PendingChecklistItem extends ChecklistItem {
  client_name: string;
  destination: string;
  arrival_date: string;
  departure_date: string;
  planner_href: string;
}

export type DashboardFollowUpKind =
  | "urgent"
  | "arrival"
  | "payment"
  | "booking"
  | "itinerary";

export interface DashboardFollowUpItem {
  key: string;
  checklistItemId: number | null;
  tripId: number;
  kind: DashboardFollowUpKind;
  task: string;
  client_name: string;
  destination: string;
  timing: string;
}

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
  event_booking: string;
  event_venue: string;
  host_name: string;
  host_phone: string;
  host_contact: string;
  tailored_for: string;
  follow_up_status: TripFollowUpStatus;
  payment_status: TripPaymentStatus;
  total_amount: string;
  amount_received: string;
  payment_method: TripPaymentMethod | "";
  payment_notes: string;
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
  checklist: ChecklistItem[];
}

export interface Establishment {
  id: number;
  name: string;
  category: string;
  city: string;
  address: string;
  contact_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  notes: string;
  price_level: string;
  tags: string;
  internal_notes: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export type EstablishmentInput = Omit<
  Establishment,
  "id" | "created_at" | "updated_at"
>;

export interface ConciergeEventRecord {
  id: number;
  name: string;
  category: string;
  destination: string;
  start_date: string;
  end_date: string;
  contact_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  notes: string;
  internal_notes: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export type ConciergeEventInput = Omit<
  ConciergeEventRecord,
  "id" | "created_at" | "updated_at"
>;

export interface EventVenueRecord {
  id: number;
  event_id: number | null;
  name: string;
  destination: string;
  contact_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  notes: string;
  internal_notes: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  event_name?: string;
}

export type EventVenueInput = Omit<
  EventVenueRecord,
  "id" | "created_at" | "updated_at" | "event_name"
>;

export const EMPTY_ESTABLISHMENT: EstablishmentInput = {
  name: "",
  category: "restaurant",
  city: "",
  address: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  instagram: "",
  notes: "",
  price_level: "",
  tags: "",
  internal_notes: "",
  is_favorite: false,
};

export const EMPTY_EVENT: ConciergeEventInput = {
  name: "",
  category: "grand_prix",
  destination: "",
  start_date: "",
  end_date: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  notes: "",
  internal_notes: "",
  is_favorite: false,
};

export const EMPTY_EVENT_VENUE: EventVenueInput = {
  event_id: null,
  name: "",
  destination: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  notes: "",
  internal_notes: "",
  is_favorite: false,
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  restaurant: "Restaurant",
  beach_club: "Beach Club",
  club: "Club",
  activity: "Activity",
  event: "Event",
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
  event_booking: "",
  event_venue: "",
  host_name: "Matthieu Dubourg",
  host_phone: "+1 332 733 9543",
  host_contact: "",
  tailored_for: "",
  follow_up_status: "follow_up",
  payment_status: "pending",
  total_amount: "",
  amount_received: "",
  payment_method: "",
  payment_notes: "",
};
