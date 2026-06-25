import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import { PaymentStatusBadge } from "@/components/status/PaymentStatusBadge";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import {
  programmesArrivingWithinDays,
  tripsToCalendarProgrammes,
} from "@/lib/calendar/programmes";
import type { Trip } from "@/lib/types";

interface Props {
  trips: Trip[];
}

export function DashboardUpcomingArrivals({ trips }: Props) {
  const programmes = tripsToCalendarProgrammes(trips);
  const today = new Date();
  const upcoming = programmesArrivingWithinDays(programmes, 7, today);

  if (upcoming.length === 0) {
    return (
      <p className="dash-accordion-empty text-sm text-muted">
        No arrivals in the next 7 days.
      </p>
    );
  }

  return (
    <div className="cal-dash-followups dash-card dash-card--arrivals px-5 py-3">
      {upcoming.slice(0, 5).map((p) => (
        <Link
          key={p.id}
          href={p.plannerHref}
          className="cal-dash-followup-link"
        >
          <div className="dash-home-programme">
            <p className="dash-home-programme__client">{p.clientName}</p>
            <p className="dash-home-programme__destination">{p.destination}</p>
            <p className="dash-home-programme__dates">
              {formatDateRange(p.arrivalDate, p.departureDate)}
            </p>
            <div className="dash-home-programme__status">
              <ProgrammeStatusBadge
                status={p.followUpStatus}
                showDot
                arrivalDate={p.arrivalDate}
              />
            </div>
            <div className="dash-home-programme__payment">
              <PaymentStatusBadge
                status={p.paymentStatus}
                arrivalDate={p.arrivalDate}
                detail={p.paymentDetail}
              />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
