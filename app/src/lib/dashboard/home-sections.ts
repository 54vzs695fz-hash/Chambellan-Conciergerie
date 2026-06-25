import {
  countClientsToFollowUp,
  countProgrammesThisWeek,
  programmesArrivingWithinDays,
  tripsToCalendarProgrammes,
} from "@/lib/calendar/programmes";
import { listBookingProgressPlanners, countBookingsRequiringAction } from "@/lib/dashboard/booking-progress";
import { countPaymentStatuses } from "@/lib/planner/payment-status";
import type { DashboardProgrammeFollowUpCard } from "@/lib/types";
import type { Trip } from "@/lib/types";
import type { TripWithDays } from "@/lib/types";

export const HOME_SECTION_IDS = [
  "booking-progress",
  "calendar-overview",
  "upcoming-arrivals",
  "clients-follow-up",
  "programmes-this-week",
  "payment-summary",
  "clients",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export interface HomeSectionCounts {
  bookingProgress: number;
  calendarOverview: number;
  upcomingArrivals: number;
  clientsToFollowUp: number;
  programmesThisWeek: number;
  paymentSummary: number;
  clients: number;
}

export function computeHomeSectionCounts({
  trips,
  confirmedTrips,
  followUpProgrammes,
  clientCount,
}: {
  trips: Trip[];
  confirmedTrips: TripWithDays[];
  followUpProgrammes: DashboardProgrammeFollowUpCard[];
  clientCount: number;
}): HomeSectionCounts {
  const programmes = tripsToCalendarProgrammes(trips);
  const today = new Date();
  const upcoming = programmesArrivingWithinDays(programmes, 7, today);
  const followUpCalendar = countClientsToFollowUp(programmes, today);
  const paymentCounts = countPaymentStatuses(trips);

  return {
    bookingProgress: countBookingsRequiringAction(
      listBookingProgressPlanners(confirmedTrips)
    ),
    calendarOverview: upcoming.length + followUpCalendar,
    upcomingArrivals: upcoming.length,
    clientsToFollowUp: followUpProgrammes.length,
    programmesThisWeek: countProgrammesThisWeek(programmes, today),
    paymentSummary: paymentCounts.pending + paymentCounts.deposit_paid,
    clients: clientCount,
  };
}
