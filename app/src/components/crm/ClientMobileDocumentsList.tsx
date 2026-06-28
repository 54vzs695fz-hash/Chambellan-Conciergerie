"use client";

import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import type { ClientTripSummary } from "@/lib/db/clients";

interface Props {
  trips: ClientTripSummary[];
}

export function ClientMobileDocumentsList({ trips }: Props) {
  if (trips.length === 0) {
    return (
      <p className="client-mobile-sheet-empty">
        No planners linked to this client yet.
      </p>
    );
  }

  return (
    <ul className="client-mobile-doc-list">
      {trips.map((trip) => (
        <li key={trip.id}>
          <div className="client-mobile-doc-card">
            <p className="client-mobile-doc-title">
              {trip.destination || "Untitled programme"}
            </p>
            {trip.arrival_date ? (
              <p className="client-mobile-doc-meta">
                {formatDateRange(trip.arrival_date, trip.departure_date)}
              </p>
            ) : null}
            <div className="client-mobile-doc-actions">
              <Link
                href={`/planner/${trip.id}`}
                className="client-mobile-doc-link"
              >
                Open planner
              </Link>
              <Link
                href={`/planner/${trip.id}/print?variant=client`}
                className="client-mobile-doc-link"
              >
                View PDF
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
