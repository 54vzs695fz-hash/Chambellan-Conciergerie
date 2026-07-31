"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardBookingProgress } from "@/components/dashboard/DashboardBookingProgress";
import { DashboardMobileBookingPriority } from "@/components/dashboard/DashboardMobileBookingPriority";
import { DashboardRecentPlanners } from "@/components/dashboard/DashboardRecentPlanners";
import {
  pruneBookingPriorityItems,
  syncBookingPriorityWithPlanners,
} from "@/lib/dashboard/booking-priority";
import type { BookingPriorityItem } from "@/lib/dashboard/booking-priority";
import type { BookingProgressPlanner } from "@/lib/dashboard/booking-progress";
import type { Trip } from "@/lib/types";

interface ClientPreview {
  id: number;
  full_name: string;
  nationality: string;
}

interface Props {
  bookingPriority: BookingPriorityItem[];
  bookingProgress: BookingProgressPlanner[];
  trips: Trip[];
  clients: ClientPreview[];
}

export function DashboardMobileHome({
  bookingPriority,
  bookingProgress,
  trips,
  clients,
}: Props) {
  const [priorityItems, setPriorityItems] = useState(() =>
    pruneBookingPriorityItems(bookingPriority)
  );
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);
  const bookingProgressRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setPriorityItems(pruneBookingPriorityItems(bookingPriority));
  }, [bookingPriority]);

  useEffect(() => {
    const pruneForToday = () => {
      setPriorityItems((current) => pruneBookingPriorityItems(current));
    };

    pruneForToday();
    const intervalId = window.setInterval(pruneForToday, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") pruneForToday();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", pruneForToday);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", pruneForToday);
    };
  }, []);

  const handlePlannersChange = useCallback(
    (planners: BookingProgressPlanner[]) => {
      setPriorityItems((current) =>
        syncBookingPriorityWithPlanners(current, planners)
      );
    },
    []
  );

  const handlePrioritySelect = useCallback((tripId: number) => {
    setExpandedTripId(tripId);
    window.requestAnimationFrame(() => {
      bookingProgressRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  return (
    <div className="dash-mobile-home md:hidden">
      <DashboardMobileBookingPriority
        items={priorityItems}
        onSelect={handlePrioritySelect}
      />

      <section
        ref={bookingProgressRef}
        className="dash-mobile-section"
        data-section="planner"
      >
        <header className="dash-mobile-section-head">
          <h2 className="dash-mobile-section-title">Booking progress</h2>
          {bookingProgress.length > 0 ? (
            <span className="dash-mobile-section-count">
              {bookingProgress.length}
            </span>
          ) : null}
        </header>
        <DashboardBookingProgress
          embedded
          initialPlanners={bookingProgress}
          expandedTripId={expandedTripId}
          onExpandedTripIdChange={setExpandedTripId}
          onPlannersChange={handlePlannersChange}
        />
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
