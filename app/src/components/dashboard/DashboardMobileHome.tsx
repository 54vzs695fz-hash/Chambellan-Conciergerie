"use client";

import Link from "next/link";
import { DashboardBookingProgress } from "@/components/dashboard/DashboardBookingProgress";
import { DashboardMobileToday } from "@/components/dashboard/DashboardMobileToday";
import { DashboardRecentPlanners } from "@/components/dashboard/DashboardRecentPlanners";
import type { BookingProgressPlanner } from "@/lib/dashboard/booking-progress";
import type { TodayActionGroup } from "@/lib/dashboard/home-today";
import type { Trip } from "@/lib/types";

interface ClientPreview {
  id: number;
  full_name: string;
  nationality: string;
}

interface Props {
  todayGroups: TodayActionGroup[];
  bookingProgress: BookingProgressPlanner[];
  trips: Trip[];
  clients: ClientPreview[];
}

export function DashboardMobileHome({
  todayGroups,
  bookingProgress,
  trips,
  clients,
}: Props) {
  return (
    <div className="dash-mobile-home md:hidden">
      <DashboardMobileToday groups={todayGroups} />

      <section className="dash-mobile-section" data-section="planner">
        <header className="dash-mobile-section-head">
          <h2 className="dash-mobile-section-title">Booking progress</h2>
          {bookingProgress.length > 0 ? (
            <span className="dash-mobile-section-count">
              {bookingProgress.length}
            </span>
          ) : null}
        </header>
        <DashboardBookingProgress embedded initialPlanners={bookingProgress} />
      </section>

      <section className="dash-mobile-section" data-section="planner">
        <header className="dash-mobile-section-head">
          <h2 className="dash-mobile-section-title">Recent planners</h2>
        </header>
        <DashboardRecentPlanners embedded trips={trips} />
      </section>

      <section className="dash-mobile-section" data-section="clients">
        <header className="dash-mobile-section-head">
          <h2 className="dash-mobile-section-title">Clients</h2>
          <Link href="/clients" className="dash-mobile-section-link btn-ghost">
            View all
          </Link>
        </header>
        {clients.length === 0 ? (
          <p className="dash-mobile-empty">No clients yet.</p>
        ) : (
          <ul className="dash-mobile-clients-list">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}`}
                  className="dash-mobile-client-link dash-card dash-card--confirmed"
                >
                  {client.full_name}
                  {client.nationality ? (
                    <span className="dash-mobile-client-meta">
                      · {client.nationality}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
