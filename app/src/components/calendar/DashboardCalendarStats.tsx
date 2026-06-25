import Link from "next/link";
import {
  countClientsToFollowUp,
  countProgrammesThisMonth,
  countProgrammesThisWeek,
  programmesArrivingWithinDays,
  tripsToCalendarProgrammes,
} from "@/lib/calendar/programmes";
import type { Trip } from "@/lib/types";

interface Props {
  trips: Trip[];
}

export function DashboardCalendarStats({ trips }: Props) {
  const programmes = tripsToCalendarProgrammes(trips);
  const today = new Date();
  const upcoming = programmesArrivingWithinDays(programmes, 7, today);
  const thisWeek = countProgrammesThisWeek(programmes, today);
  const thisMonth = countProgrammesThisMonth(programmes, today);
  const followUp = countClientsToFollowUp(programmes, today);

  return (
    <div className="dash-embedded-section" data-section="calendar">
      <div className="dash-embedded-head">
        <Link href="/calendar" className="btn-ghost">
          Open calendar
        </Link>
      </div>
      <div className="cal-dash-grid">
        <div className="cal-dash-stat dash-card dash-card--arrivals">
          <p className="cal-dash-stat-value">{upcoming.length}</p>
          <p className="cal-dash-stat-label">Upcoming arrivals (7 days)</p>
        </div>
        <div className="cal-dash-stat dash-card dash-card--confirmed">
          <p className="cal-dash-stat-value">{thisWeek}</p>
          <p className="cal-dash-stat-label">Programmes this week</p>
        </div>
        <div className="cal-dash-stat dash-card dash-card--confirmed">
          <p className="cal-dash-stat-value">{thisMonth}</p>
          <p className="cal-dash-stat-label">Programmes this month</p>
        </div>
        <div className="cal-dash-stat dash-card dash-card--follow-up">
          <p className="cal-dash-stat-value">{followUp}</p>
          <p className="cal-dash-stat-label">Clients to follow up</p>
        </div>
      </div>
    </div>
  );
}
