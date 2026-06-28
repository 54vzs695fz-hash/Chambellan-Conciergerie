"use client";

import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import type { ClientTripSummary } from "@/lib/db/clients";

interface Props {
  trips: ClientTripSummary[];
}

export function ClientMobileArchiveList({ trips }: Props) {
  const completed = trips.filter((trip) => trip.follow_up_status === "completed");

  if (completed.length === 0) {
    return (
      <p className="client-mobile-sheet-empty">
        Completed programmes appear here once marked as completed in the
        planner.
      </p>
    );
  }

  return (
    <ul className="client-mobile-doc-list">
      {completed.map((trip) => (
        <li key={trip.id}>
          <Link href={`/planner/${trip.id}`} className="client-mobile-doc-card client-mobile-doc-card--link">
            <p className="client-mobile-doc-title">
              {trip.destination || "Untitled programme"}
            </p>
            {trip.arrival_date ? (
              <p className="client-mobile-doc-meta">
                {formatDateRange(trip.arrival_date, trip.departure_date)}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
