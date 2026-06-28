import Link from "next/link";
import type { BookingProgressPlanner } from "@/lib/dashboard/booking-progress";

interface Props {
  planners: BookingProgressPlanner[];
}

function progressBarClass(
  tone: BookingProgressPlanner["summary"]["progressTone"]
): string {
  return `dash-mobile-bp-bar dash-mobile-bp-bar--${tone}`;
}

export function DashboardMobileBookingProgress({ planners }: Props) {
  return (
    <section className="dash-mobile-section" data-section="planner">
      <header className="dash-mobile-section-head">
        <h2 className="dash-mobile-section-title">Booking progress</h2>
        {planners.length > 0 ? (
          <span className="dash-mobile-section-count">{planners.length}</span>
        ) : null}
      </header>

      {planners.length === 0 ? (
        <p className="dash-mobile-empty">
          No active planners with bookings to complete.
        </p>
      ) : (
        <ul className="dash-mobile-bp-list">
          {planners.map((planner) => {
            const remainingLabel = `${planner.summary.remaining} booking${
              planner.summary.remaining === 1 ? "" : "s"
            } remaining`;

            return (
              <li key={planner.tripId}>
                <Link
                  href={planner.href}
                  className="dash-mobile-bp-card dash-card dash-card--confirmed"
                >
                  <div className="dash-mobile-bp-card-head">
                    <p className="dash-mobile-bp-client">{planner.client_name}</p>
                    <p className="dash-mobile-bp-destination">
                      {planner.destination}
                    </p>
                    {planner.destination_subtitle ? (
                      <p className="dash-mobile-bp-destination-sub">
                        {planner.destination_subtitle}
                      </p>
                    ) : null}
                  </div>

                  <dl className="dash-mobile-bp-meta">
                    <div>
                      <dt>Dates</dt>
                      <dd>{planner.dates}</dd>
                    </div>
                    {planner.guest_count ? (
                      <div>
                        <dt>Guests</dt>
                        <dd>{planner.guest_count}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="dash-mobile-bp-progress">
                    <div
                      className="dash-mobile-bp-track"
                      role="progressbar"
                      aria-valuenow={planner.summary.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${planner.summary.percent}% confirmed`}
                    >
                      <div
                        className={progressBarClass(
                          planner.summary.progressTone
                        )}
                        style={{ width: `${planner.summary.percent}%` }}
                      />
                    </div>
                    <p className="dash-mobile-bp-remaining">{remainingLabel}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
