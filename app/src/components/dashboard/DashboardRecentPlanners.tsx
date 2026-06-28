import Link from "next/link";
import { PlannerArrivalCountdown } from "@/components/planner/PlannerArrivalCountdown";
import { PaymentStatusBadge } from "@/components/status/PaymentStatusBadge";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import {
  groupRecentPlanners,
  hasRecentPlanners,
  type RecentPlannerPhase,
} from "@/lib/dashboard/recent-planners";
import { normalizeTripPaymentStatus } from "@/lib/planner/payment-status";
import { paymentRemainingBadgeLabel } from "@/lib/planner/payment-summary";
import { DestinationDisplayLabel } from "@/components/planner/DestinationDisplayLabel";
import { resolveDashboardDestinationDisplay } from "@/lib/planner/trip-destinations";
import { formatDateRange } from "@/lib/planner-utils";
import type { Trip } from "@/lib/types";

interface Props {
  trips: Trip[];
  embedded?: boolean;
}

const SECTION_CARD_CLASS: Record<RecentPlannerPhase, string> = {
  in_stay: "dash-card dash-card--prog-arrival",
  upcoming: "dash-card dash-card--confirmed",
  past: "dash-card dash-card--follow-up",
};

function RecentPlannerCard({
  trip,
  phase,
}: {
  trip: Trip;
  phase: RecentPlannerPhase;
}) {
  const paymentStatus = normalizeTripPaymentStatus(trip.payment_status);
  const destinationDisplay = resolveDashboardDestinationDisplay(trip, "Untitled");

  return (
    <li>
      <Link
        href={`/planner/${trip.id}`}
        className={`${SECTION_CARD_CLASS[phase]} dash-list-link dash-recent-card`}
      >
        <div className="dash-home-programme dash-home-programme--card">
          <div className="dash-home-programme__content">
            <p className="dash-home-programme__client">
              {trip.client_name.trim() || "Client"}
            </p>
            <DestinationDisplayLabel
              primary={destinationDisplay.primary}
              secondary={destinationDisplay.secondary}
            />
            <p className="dash-home-programme__dates">
              {formatDateRange(trip.arrival_date, trip.departure_date)}
            </p>
            <PlannerArrivalCountdown
              arrivalDate={trip.arrival_date}
              departureDate={trip.departure_date}
            />
          </div>
          <div className="dash-home-programme__badges">
            <div className="dash-home-programme__status">
              <ProgrammeStatusBadge
                status={trip.follow_up_status ?? "follow_up"}
                showDot
                arrivalDate={trip.arrival_date}
              />
            </div>
            <div className="dash-home-programme__payment">
              <PaymentStatusBadge
                status={paymentStatus}
                arrivalDate={trip.arrival_date}
                detail={paymentRemainingBadgeLabel(trip)}
              />
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

function RecentPlannerSection({
  title,
  trips,
  phase,
}: {
  title: string;
  trips: Trip[];
  phase: RecentPlannerPhase;
}) {
  if (trips.length === 0) return null;

  return (
    <div className="dash-recent-section">
      <h3 className="dash-recent-section-title">{title}</h3>
      <ul className="dash-recent-list space-y-2">
        {trips.map((trip) => (
          <RecentPlannerCard key={trip.id} trip={trip} phase={phase} />
        ))}
      </ul>
    </div>
  );
}

export function DashboardRecentPlanners({
  trips,
  embedded = false,
}: Props) {
  const groups = groupRecentPlanners(trips);

  const body = !hasRecentPlanners(groups) ? (
    <p className="dash-accordion-empty text-sm text-muted">No planners yet.</p>
  ) : (
    <div className="dash-recent-groups">
      <RecentPlannerSection
        title="Currently in stay"
        trips={groups.inStay}
        phase="in_stay"
      />
      <RecentPlannerSection
        title="Upcoming planners"
        trips={groups.upcoming}
        phase="upcoming"
      />
      {groups.past.length > 0 ? (
        <details className="dash-recent-past">
          <summary className="dash-recent-past-summary min-h-[44px]">
            <span className="dash-recent-section-title">Past planners</span>
            <span className="dash-recent-past-count">{groups.past.length}</span>
          </summary>
          <ul className="dash-recent-list space-y-2">
            {groups.past.map((trip) => (
              <RecentPlannerCard key={trip.id} trip={trip} phase="past" />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="dash-embedded-section dash-recent-planners-embedded">
        <div className="dash-embedded-head">
          <Link href="/planner" className="btn-ghost">
            View all
          </Link>
        </div>
        {body}
      </div>
    );
  }

  return (
    <section className="mb-10 dash-recent-planners" data-section="planner">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Recent planners</h2>
        <Link href="/planner" className="btn-ghost">
          View all
        </Link>
      </div>
      {body}
    </section>
  );
}
