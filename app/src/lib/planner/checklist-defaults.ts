import type { ChecklistCategory } from "@/lib/types";

export const CHECKLIST_CATEGORY_ORDER: ChecklistCategory[] = [
  "programme",
  "reservations",
  "transport",
  "accommodation",
  "payments",
  "concierge_services",
  "arrival",
  "during_stay",
  "departure",
];

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  programme: "Programme",
  reservations: "Reservations",
  transport: "Transport",
  accommodation: "Accommodation",
  payments: "Payments",
  concierge_services: "Concierge Services",
  arrival: "Arrival",
  during_stay: "During Stay",
  departure: "Departure",
};

export const DEFAULT_CHECKLIST_ITEMS: Record<ChecklistCategory, string[]> = {
  programme: [
    "Programme confirmation",
    "Final itinerary sent",
    "Last modifications requested",
    "Client approval received",
  ],
  reservations: [
    "Restaurants confirmed",
    "Beach clubs confirmed",
    "Night clubs confirmed",
    "Event tickets confirmed",
  ],
  transport: [
    "Airport transfer booked",
    "Driver confirmed",
    "Vehicle assigned",
    "Return transfer confirmed",
  ],
  accommodation: [
    "Hotel confirmed",
    "Villa confirmed",
    "Check-in details sent",
  ],
  payments: [
    "Deposit requested",
    "Deposit received",
    "Balance requested",
    "Fully paid",
    "Invoice sent",
  ],
  concierge_services: [
    "Yacht confirmed",
    "Security confirmed",
    "Butler confirmed",
    "Chef confirmed",
    "VIP access confirmed",
  ],
  arrival: [
    "Arrival details received",
    "Flight details received",
    "Client arrived",
    "Welcome message sent",
  ],
  during_stay: [
    "Day 1 checked",
    "Day 2 checked",
    "Special requests completed",
    "Daily follow-up completed",
  ],
  departure: [
    "Departure transfer confirmed",
    "Client departed",
    "Feedback requested",
    "Future trip discussed",
  ],
};

export const CHECKLIST_STATUS_LABELS = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
} as const;

export const CHECKLIST_STATUS_OPTIONS = [
  "todo",
  "in_progress",
  "done",
] as const;
