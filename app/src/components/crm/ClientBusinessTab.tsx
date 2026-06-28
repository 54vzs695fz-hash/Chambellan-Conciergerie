"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateRange } from "@/lib/planner-utils";
import type { ClientBusinessStay, CommissionDisplayStatus } from "@/lib/types";

interface Props {
  initialStays: ClientBusinessStay[];
  variant?: "default" | "compact";
}

const STATUS_OPTIONS: CommissionDisplayStatus[] = [
  "pending",
  "received",
  "not_eligible",
];

function statusClass(status: CommissionDisplayStatus): string {
  switch (status) {
    case "received":
      return "client-business-status client-business-status--received";
    case "not_eligible":
      return "client-business-status client-business-status--ineligible";
    default:
      return "client-business-status client-business-status--pending";
  }
}

export function ClientBusinessTab({
  initialStays,
  variant = "default",
}: Props) {
  const compact = variant === "compact";
  const [stays, setStays] = useState(initialStays);
  const [savingEntryId, setSavingEntryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateEntry = async (
    entryId: number,
    patch: { status?: CommissionDisplayStatus; notes?: string }
  ) => {
    setSavingEntryId(entryId);
    setError(null);

    const res = await fetch(`/api/stay-closing-entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    setSavingEntryId(null);

    if (!res.ok) {
      setError("Could not save changes. Please try again.");
      return false;
    }

    const data = (await res.json()) as {
      status: CommissionDisplayStatus;
      status_label: string;
      notes: string;
      commission_received: boolean;
      commission_payable: boolean;
    };

    setStays((prev) =>
      prev.map((stay) => {
        if (!stay.establishments.some((est) => est.entry_id === entryId)) {
          return stay;
        }

        const establishments = stay.establishments.map((est) =>
          est.entry_id === entryId
            ? {
                ...est,
                status: data.status,
                status_label: data.status_label,
                notes: data.notes,
                commission_received: data.commission_received,
                commission_payable: data.commission_payable,
              }
            : est
        );

        return {
          ...stay,
          establishments,
          ...recalculateStayTotals(establishments),
        };
      })
    );

    return true;
  };

  if (stays.length === 0) {
    return (
      <section className="client-business">
        <p className={compact ? "client-mobile-sheet-empty" : "text-sm text-muted"}>
          Completed stays with billing appear here after closing a stay in the
          planner.
        </p>
      </section>
    );
  }

  return (
    <section className="client-business">
      {!compact ? (
        <div className="mb-4">
          <h2 className="section-title mb-1">Business</h2>
          <p className="text-sm text-muted">
            Internal only — never included in client PDFs.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700 mb-3" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="client-business-stay-list">
        {stays.map((stay) => (
          <li key={stay.trip_id} className="client-business-stay card">
            <div className="client-business-stay-head">
              <div>
                <Link
                  href={`/planner/${stay.trip_id}`}
                  className="font-serif text-gold hover:underline"
                >
                  {stay.destination}
                </Link>
                <p className="text-xs text-muted mt-1">
                  {formatDateRange(stay.arrival_date, stay.departure_date)}
                </p>
              </div>
              {!stay.has_closing_data ? (
                <p className="text-xs text-muted">
                  Close this stay in the planner to record billing.
                </p>
              ) : null}
            </div>

            {stay.has_closing_data ? (
              <>
                {!compact ? (
                  <div className="client-business-summary">
                    <div>
                      <span className="client-business-metric-label">
                        Approx. stay spend
                      </span>
                      <strong>{stay.approximate_stay_spend_label}</strong>
                    </div>
                    <div>
                      <span className="client-business-metric-label">
                        Expected commission
                      </span>
                      <strong>{stay.expected_commission_label}</strong>
                    </div>
                    <div>
                      <span className="client-business-metric-label">
                        Received commission
                      </span>
                      <strong>{stay.received_commission_label}</strong>
                    </div>
                    <div>
                      <span className="client-business-metric-label">
                        Outstanding commission
                      </span>
                      <strong>{stay.outstanding_commission_label}</strong>
                    </div>
                  </div>
                ) : null}

                <ul className="client-business-establishments">
                {stay.establishments.map((est) => (
                  <li key={`${stay.trip_id}-${est.establishment_name}`}>
                    <div className="client-business-est-head">
                      <h3 className="client-business-est-name">
                        {est.establishment_name}
                      </h3>
                      <span className={statusClass(est.status)}>
                        {est.status_label}
                      </span>
                    </div>

                    <dl className="client-business-est-details">
                      <div>
                        <dt>Bill</dt>
                        <dd>{est.approximate_bill}</dd>
                      </div>
                      {!compact && est.show_premium_drinks ? (
                        <div>
                          <dt>Premium drinks</dt>
                          <dd>{est.premium_drinks_amount}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>Commission</dt>
                        <dd>{est.commission_label}</dd>
                      </div>
                    </dl>

                    {!compact && est.pending_season_target ? (
                      <p className="client-business-season-note text-xs text-muted">
                        Pending season target
                      </p>
                    ) : null}

                    {est.entry_id !== null &&
                    est.status !== "not_eligible" ? (
                      <div className="client-business-est-actions">
                        <label className="client-business-status-field">
                          <span className="field-label">Status</span>
                          <select
                            className="field-input min-h-[44px]"
                            value={est.status}
                            disabled={savingEntryId === est.entry_id}
                            onChange={(event) => {
                              const value = event.target
                                .value as CommissionDisplayStatus;
                              if (value === "not_eligible") return;
                              void updateEntry(est.entry_id!, {
                                status: value,
                              });
                            }}
                          >
                            {STATUS_OPTIONS.filter(
                              (option) => option !== "not_eligible"
                            ).map((option) => (
                              <option key={option} value={option}>
                                {option === "received"
                                  ? "Received"
                                  : "Pending"}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : null}

                    {est.entry_id !== null ? (
                      <label className="client-business-notes-field">
                        <span className="field-label">Notes</span>
                        <textarea
                          className="field-input"
                          value={est.notes}
                          rows={2}
                          disabled={savingEntryId === est.entry_id}
                          onChange={(event) => {
                            const notes = event.target.value;
                            setStays((prev) =>
                              prev.map((item) =>
                                item.trip_id === stay.trip_id
                                  ? {
                                      ...item,
                                      establishments: item.establishments.map(
                                        (row) =>
                                          row.entry_id === est.entry_id
                                            ? { ...row, notes }
                                            : row
                                      ),
                                    }
                                  : item
                              )
                            );
                          }}
                          onBlur={(event) => {
                            void updateEntry(est.entry_id!, {
                              notes: event.target.value,
                            });
                          }}
                          placeholder="Internal notes for this visit…"
                        />
                      </label>
                    ) : null}
                  </li>
                ))}
              </ul>
              </>
            ) : (
              <ul className="client-stay-history-tags">
                {stay.establishments.map((est) => (
                  <li key={est.establishment_name}>{est.establishment_name}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function recalculateStayTotals(
  establishments: ClientBusinessStay["establishments"]
): Pick<
  ClientBusinessStay,
  | "expected_commission"
  | "expected_commission_label"
  | "received_commission"
  | "received_commission_label"
  | "outstanding_commission"
  | "outstanding_commission_label"
> {
  let expected = 0;
  let received = 0;
  let outstanding = 0;

  for (const est of establishments) {
    if (est.commission_amount <= 0) continue;
    expected += est.commission_amount;
    if (est.commission_received) received += est.commission_amount;
    else if (est.commission_payable) outstanding += est.commission_amount;
  }

  const fmt = (amount: number) =>
    amount > 0
      ? `€${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : "—";

  return {
    expected_commission: expected,
    expected_commission_label: fmt(expected),
    received_commission: received,
    received_commission_label: fmt(received),
    outstanding_commission: outstanding,
    outstanding_commission_label: fmt(outstanding),
  };
}
