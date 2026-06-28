"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateRange } from "@/lib/planner-utils";
import type { ClientStayHistoryItem } from "@/lib/types";

interface Props {
  initialHistory: ClientStayHistoryItem[];
  variant?: "default" | "sheet" | "vip-only";
}

export function ClientStayHistorySection({
  initialHistory,
  variant = "default",
}: Props) {
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
        {variant === "default" ? (
          <>
            <h2 className="section-title mb-2">Stay history</h2>
            <p className="text-sm text-muted">
              Completed stays appear here automatically with destinations, visits, and
              approximate spend once a stay is closed.
            </p>
          </>
        ) : (
          <p className="client-mobile-sheet-empty">
            No completed stays recorded yet.
          </p>
        )}
      </section>
    );
  }

  const showHeader = variant === "default";
  const vipOnly = variant === "vip-only";

  return (
    <section className="client-stay-history">
      {showHeader ? (
        <div className="mb-4">
          <h2 className="section-title mb-1">Stay history</h2>
          <p className="text-sm text-muted">
            Internal VIP notes — not included in client PDFs. Commission details are
            in the Business tab.
          </p>
        </div>
      ) : null}

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
                {!vipOnly ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <p className="client-stay-history-destination font-serif text-gold">
                      {stay.destination}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {formatDateRange(stay.arrival_date, stay.departure_date)}
                    </p>
                  </>
                )}
              </div>
              {!vipOnly ? (
                <div className="client-stay-history-totals">
                  <div>
                    <span className="client-stay-history-metric-label">
                      Approx. spend
                    </span>
                    <strong>{stay.approximate_stay_spend_label}</strong>
                  </div>
                </div>
              ) : null}
            </div>

            {!vipOnly ? (
              <div className="client-stay-history-section">
                <h3 className="client-stay-history-subtitle">Visited establishments</h3>
                {stay.visited_establishments.length === 0 ? (
                  <p className="text-sm text-muted">No venue visits recorded.</p>
                ) : (
                  <ul className="client-stay-history-tags">
                    {stay.visited_establishments.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                )}
                {!stay.has_closing_data ? (
                  <p className="text-xs text-muted mt-2">
                    Close this stay in the planner to record spend.
                  </p>
                ) : null}
              </div>
            ) : null}

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
