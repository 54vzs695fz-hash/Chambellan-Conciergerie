import {
  daysUntilArrival,
  startOfDay,
  toIsoDate,
} from "@/lib/calendar/programmes";
import {
  getArrivalUrgency,
  type ArrivalUrgency,
} from "@/lib/calendar/status-styles";

export interface ArrivalCountdownInfo {
  label: string;
  urgency: ArrivalUrgency | null;
}

export function getArrivalCountdown(
  arrivalDate: string,
  departureDate: string,
  today = startOfDay(new Date())
): ArrivalCountdownInfo | null {
  const todayStr = toIsoDate(today);

  if (!arrivalDate && !departureDate) return null;

  if (departureDate && departureDate < todayStr) {
    return { label: "Completed stay", urgency: null };
  }

  if (
    arrivalDate &&
    departureDate &&
    arrivalDate <= todayStr &&
    departureDate >= todayStr
  ) {
    return { label: "Currently in stay", urgency: null };
  }

  if (!arrivalDate) return null;

  const days = daysUntilArrival(arrivalDate, today);
  if (days === null) return null;

  if (days < 0) {
    if (departureDate && departureDate >= todayStr) {
      return { label: "Currently in stay", urgency: null };
    }
    return { label: "Completed stay", urgency: null };
  }

  if (days === 0) {
    return {
      label: "Arrives today",
      urgency: getArrivalUrgency(arrivalDate, today),
    };
  }

  if (days === 1) {
    return {
      label: "Arrives tomorrow",
      urgency: getArrivalUrgency(arrivalDate, today),
    };
  }

  return {
    label: `Arrival in ${days} days`,
    urgency: getArrivalUrgency(arrivalDate, today),
  };
}
