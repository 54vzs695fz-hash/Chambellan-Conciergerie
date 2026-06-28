"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateRange } from "@/lib/planner-utils";
import type { ClientStayHistoryItem } from "@/lib/types";

interface Props {
  initialHistory: ClientStayHistoryItem[];
}

export function ClientStayHistorySection({ initialHistory }: Props) {
  const [history, setHistory] = useState(initialHistory);
  const [savingTripId, setSavingTripId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveVipNotes = async (tripId: number, vipNotes: string) => {
    setSavingTripId(tripId);
    setError(null);

    const res = await fetch(`/api/trips/${tripId}/stay-closing/vip-notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vip_notes: vipNotes }),
    });

    setSavingTripId(null);

    if (!res.ok) {
      setError("Could not save VIP notes. Please try again.");
      return;
    }

    const data = (await res.json()) as { vip_notes: string };
    setHistory((prev) =>
      prev.map((item) =>
        item.trip_id === tripId ? { ...item, vip_notes: data.vip_notes } : item
      )
    );
  };

  if (history.length === 0) {
    return (
      <section className="client-stay-history">
        <h2 className="section-title mb-2">Stay history</h2>
        <p className="text-sm text-muted">
          Completed stays appear here automatically with destinations, visits, and
          internal billing once a stay is closed.
        </p>
      </section>
    );
  }

  return (
    <section className="client-stay-history">
      <div className="mb-4">
        <h2 className="section-title mb-1">Stay history</h2>
        <p className="text-sm text-muted">
          Internal only — billing and commission are not included in client PDFs.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700 mb-3" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="client-stay-history-list">
        {history.map((stay) => (
          <li key={stay.trip_id} className="client-stay-history-card card">
            <div className="client-stay-history-card-head">
              <div>
                <Link
                  href={`/planner/${stay.trip_id}`}
                  className="client-stay-history-destination font-serif text-gold hover:underline"
                >
                  {stay.destination}
                </Link>
                {stay.destination_region ? (
                  <p className="text-xs text-muted mt-0.5">
                    {stay.destination_region}
                  </p>
                ) : null}
                <p className="text-xs text-muted mt-1">
                  {formatDateRange(stay.arrival_date, stay.departure_date)}
                </p>
              </div>
              <div className="client-stay-history-totals">
                <div>
                  <span className="client-stay-history-metric-label">
                    Approx. spend
                  </span>
                  <strong>{stay.approximate_stay_spend_label}</strong>
                </div>
                <div>
                  <span className="client-stay-history-metric-label">
                    Commission
                  </span>
                  <strong>{stay.commission_generated_label}</strong>
                </div>
              </div>
            </div>

            <div className="client-stay-history-section">
              <h3 className="client-stay-history-subtitle">Visited establishments</h3>
              {stay.visited_establishments.length === 0 ? (
                <p className="text-sm text-muted">No venue visits recorded.</p>
              ) : stay.has_closing_data ? (
                <ul className="client-stay-history-establishments">
                  {stay.establishments.map((establishment) => (
                    <li key={establishment.name}>
                      <span className="client-stay-history-est-name">
                        {establishment.name}
                      </span>
                      <span className="client-stay-history-est-meta text-sm text-muted">
                        Bill {establishment.approximate_total_bill}
                        {establishment.commission_applied
                          ? ` · Commission ${establishment.commission}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="client-stay-history-tags">
                  {stay.visited_establishments.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
              {!stay.has_closing_data ? (
                <p className="text-xs text-muted mt-2">
                  Close this stay in the planner to record spend and commission.
                </p>
              ) : null}
            </div>

            <div className="client-stay-history-section">
              <label className="client-stay-history-vip-field">
                <span className="client-stay-history-subtitle">VIP notes</span>
                <textarea
                  className="field-input client-stay-history-vip-input"
                  value={stay.vip_notes}
                  onChange={(event) => {
                    const value = event.target.value;
                    setHistory((prev) =>
                      prev.map((item) =>
                        item.trip_id === stay.trip_id
                          ? { ...item, vip_notes: value }
                          : item
                      )
                    );
                  }}
                  onBlur={(event) => {
                    void saveVipNotes(stay.trip_id, event.target.value);
                  }}
                  placeholder="Preferences, special requests, follow-up for next visit…"
                  rows={3}
                  disabled={savingTripId === stay.trip_id}
                />
              </label>
              {savingTripId === stay.trip_id ? (
                <p className="text-xs text-muted mt-1">Saving…</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
