export const EVENT_CATEGORIES = [
  "grand_prix",
  "festival",
  "night_event",
  "hospitality",
  "sporting_event",
  "yacht_event",
  "vip_experience",
  "private_event",
  "other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  grand_prix: "Grand Prix",
  festival: "Festival",
  night_event: "Night Event",
  hospitality: "Hospitality",
  sporting_event: "Sporting Event",
  yacht_event: "Yacht Event",
  vip_experience: "VIP Experience",
  private_event: "Private Event",
  other: "Other",
};

export function isEventCategory(value: string): value is EventCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(value);
}
