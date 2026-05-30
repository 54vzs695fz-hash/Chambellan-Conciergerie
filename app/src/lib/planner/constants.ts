import type { ActivityPeriod } from "../types";

export const PLANNER_PERIODS: ActivityPeriod[] = [
  "morning",
  "afternoon",
  "evening",
];

export const PERIOD_ROW_LABELS: Record<ActivityPeriod, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening / Night",
};

export type { ActivityPeriod } from "../types";

/** Luxury palette — Monaco / St-Tropez / Dubai concierge */
export const LUXURY = {
  white: "#ffffff",
  cream: "#faf8f5",
  beige: "#f0ebe3",
  beigeDeep: "#e8e0d6",
  sand: "#ddd4c8",
  gold: "#9a7b4f",
  goldLight: "#b8956a",
  ink: "#2a2622",
  muted: "#7a736c",
  faint: "#b8b0a6",
} as const;
