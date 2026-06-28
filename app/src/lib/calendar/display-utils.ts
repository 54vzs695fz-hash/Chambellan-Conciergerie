import type { CalendarProgramme } from "@/lib/calendar/programmes";
import type { TripFollowUpStatus, TripPaymentStatus } from "@/lib/types";

export function shortClientName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  if (parts.length === 1) return parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  return `${parts[0]} ${lastInitial}.`;
}

export function destinationShortLabel(destination: string, maxLen = 14): string {
  const trimmed = destination.trim() || "Untitled";
  if (trimmed.length <= maxLen) return trimmed;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const initials = words
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
    if (initials.length >= 2) return initials.slice(0, 4);
  }
  return trimmed.slice(0, maxLen);
}

export function programmeChipLabel(programme: CalendarProgramme): string {
  const destinationLabel = programme.destinationSubtitle
    ? `${destinationShortLabel(programme.destination)} · ${destinationShortLabel(programme.destinationSubtitle, 18)}`
    : destinationShortLabel(programme.destination);
  return `${shortClientName(programme.clientName)} · ${destinationLabel}`;
}

export const PROGRAMME_STATUS_DOT: Record<TripFollowUpStatus, string> = {
  follow_up: "cal-dot--follow-up",
  contacted: "cal-dot--contacted",
  confirmed: "cal-dot--confirmed",
  completed: "cal-dot--completed",
};

export const PAYMENT_STATUS_DOT: Record<TripPaymentStatus, string> = {
  pending: "cal-dot--pay-pending",
  deposit_paid: "cal-dot--pay-deposit",
  fully_paid: "cal-dot--pay-full",
  cancelled: "cal-dot--pay-cancelled",
};
