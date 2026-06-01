import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
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

export function DashboardCalendarWidget({ trips }: Props) {
  const programmes = tripsToCalendarProgrammes(trips);
  const today = new Date();
  const upcoming = programmesArrivingWithinDays(programmes, 7, today);
  const thisWeek = countProgrammesThisWeek(programmes, today);
  const thisMonth = countProgrammesThisMonth(programmes, today);
  const followUp = countClientsToFollowUp(programmes, today);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Calendar overview</h2>
        <Link href="/calendar" className="btn-ghost">
          Open calendar
        </Link>
      </div>

      <div className="cal-dash-grid">
        <div className="cal-dash-stat">
          <p className="cal-dash-stat-value">{upcoming.length}</p>
          <p className="cal-dash-stat-label">Upcoming arrivals (7 days)</p>
        </div>
        <div className="cal-dash-stat">
          <p className="cal-dash-stat-value">{thisWeek}</p>
          <p className="cal-dash-stat-label">Programmes this week</p>
        </div>
        <div className="cal-dash-stat">
          <p className="cal-dash-stat-value">{thisMonth}</p>
          <p className="cal-dash-stat-label">Programmes this month</p>
        </div>
        <div className="cal-dash-stat">
          <p className="cal-dash-stat-value">{followUp}</p>
          <p className="cal-dash-stat-label">Clients to follow up</p>
        </div>
      </div>

      {upcoming.length > 0 ? (
        <div className="cal-dash-followups card px-5 py-3">
          {upcoming.slice(0, 5).map((p) => (
            <Link
              key={p.id}
              href={p.plannerHref}
              className="cal-dash-followup-link"
            >
              <span className="dash-planner-row">
                <span className="dash-planner-meta">
                  {p.clientName} · {p.destination}
                  <br />
                  <span>{formatDateRange(p.arrivalDate, p.departureDate)}</span>
                </span>
                <ProgrammeStatusBadge
                  status={p.followUpStatus}
                  showDot
                  arrivalDate={p.arrivalDate}
                />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No arrivals in the next 7 days.</p>
      )}
    </section>
  );
}
