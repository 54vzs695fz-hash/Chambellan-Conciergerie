"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatEstablishmentCommissionSummary,
  type EstablishmentCommissionFields,
} from "@/lib/establishments/commission";
import {
  ESTABLISHMENT_CATEGORY_LABELS,
  type EstablishmentCategory,
} from "@/lib/establishments/categories";
import { calculateStayClosingCommission } from "@/lib/stay-closing/calculate-commission";
import type { StayClosing } from "@/lib/types";
import type { VisitedEstablishment } from "@/lib/stay-closing/visited-establishments";

interface FormRow {
  key: string;
  establishment_id: number | null;
  establishment_name: string;
  category: EstablishmentCategory | null;
  activity_ids: number[];
  visit_dates: string[];
  commission: EstablishmentCommissionFields;
  commission_summary: string;
  show_premium_drinks: boolean;
  approximate_total_bill: string;
  premium_drinks_amount: string;
  internal_notes: string;
  commission_result: ReturnType<typeof calculateStayClosingCommission>;
  commission_pending_season_target: boolean;
}

interface PreviewResponse {
  visited: VisitedEstablishment[];
  closing: StayClosing | null;
}

interface Props {
  tripId: number;
  open: boolean;
  onClose: () => void;
  onSaved?: (closing: StayClosing) => void;
}

function formatVisitDates(dates: string[]): string {
  if (!dates.length) return "";
  if (dates.length === 1) return dates[0];
  return `${dates[0]} – ${dates[dates.length - 1]}`;
}

function buildFormRows(preview: PreviewResponse): FormRow[] {
  const savedByKey = new Map<string, StayClosing["entries"][number]>();
  for (const entry of preview.closing?.entries ?? []) {
    const key =
      entry.establishment_id !== null
        ? `est-${entry.establishment_id}`
        : `name-${entry.establishment_name.trim().toLowerCase()}`;
    savedByKey.set(key, entry);
  }

  return preview.visited.map((visited) => {
    const saved =
      savedByKey.get(visited.key) ??
      preview.closing?.entries.find(
        (entry) =>
          entry.establishment_name.trim().toLowerCase() ===
          visited.establishment_name.trim().toLowerCase()
      );

    const amounts = {
      approximate_total_bill: saved?.approximate_total_bill ?? "",
      food_amount: "",
      premium_drinks_amount: saved?.premium_drinks_amount ?? "",
    };

    return {
      key: visited.key,
      establishment_id: visited.establishment_id,
      establishment_name: visited.establishment_name,
      category: visited.category,
      activity_ids: visited.activity_ids,
      visit_dates: visited.visit_dates,
      commission: visited.commission,
      commission_summary: formatEstablishmentCommissionSummary(visited.commission),
      show_premium_drinks: visited.field_requirements.show_premium_drinks,
      approximate_total_bill: amounts.approximate_total_bill,
      premium_drinks_amount: amounts.premium_drinks_amount,
      internal_notes: saved?.internal_notes ?? "",
      commission_result: calculateStayClosingCommission(
        visited.commission,
        amounts
      ),
      commission_pending_season_target:
        saved?.commission_pending_season_target ?? false,
    };
  });
}

function recalculateRow(row: FormRow): FormRow {
  const amounts = {
    approximate_total_bill: row.approximate_total_bill,
    food_amount: "",
    premium_drinks_amount: row.premium_drinks_amount,
  };
  return {
    ...row,
    commission_result: calculateStayClosingCommission(row.commission, amounts),
  };
}

export function StayClosingDialog({ tripId, open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [closedAt, setClosedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/stay-closing`);
      if (!res.ok) {
        throw new Error("Could not load stay closing data");
      }
      const data = (await res.json()) as PreviewResponse;
      setRows(buildFormRows(data));
      setClosedAt(data.closing?.closed_at ?? null);
    } catch {
      setError("Could not load stay closing data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const totalCommission = useMemo(() => {
    return rows.reduce((sum, row) => {
      if (row.commission_result.applied && row.commission_result.amount !== null) {
        return sum + row.commission_result.amount;
      }
      return sum;
    }, 0);
  }, [rows]);

  const updateRow = (
    key: string,
    patch: Partial<
      Pick<
        FormRow,
        | "approximate_total_bill"
        | "premium_drinks_amount"
        | "internal_notes"
      >
    >
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        return recalculateRow({ ...row, ...patch });
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/stay-closing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: rows.map((row) => ({
            key: row.key,
            establishment_id: row.establishment_id,
            establishment_name: row.establishment_name,
            activity_ids: row.activity_ids,
            approximate_total_bill: row.approximate_total_bill,
            food_amount: "",
            premium_drinks_amount: row.premium_drinks_amount,
            internal_notes: row.internal_notes,
          })),
        }),
      });
      if (!res.ok) {
        throw new Error("Could not save");
      }
      const closing = (await res.json()) as StayClosing;
      setClosedAt(closing.closed_at);
      onSaved?.(closing);
      onClose();
    } catch {
      setError("Could not save stay closing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="est-dialog-overlay stay-closing-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="est-dialog-panel stay-closing-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stay-closing-title"
      >
        <header className="stay-closing-header">
          <h2
            id="stay-closing-title"
            className="font-serif text-xl tracking-wide"
          >
            Close Stay
          </h2>
          <p className="text-sm text-muted mt-1">
            Collect billing information once per establishment visited.
          </p>
          {closedAt ? (
            <p className="stay-closing-closed-badge text-sm mt-2" role="status">
              Last saved {new Date(closedAt).toLocaleString()}
            </p>
          ) : null}
        </header>

        {loading ? (
          <p className="text-sm text-muted py-6">Loading establishments…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted py-6">
            No restaurant, beach club, or club visits found on this itinerary.
          </p>
        ) : (
          <div className="stay-closing-list">
            {rows.map((row) => (
              <article key={row.key} className="stay-closing-card">
                <div className="stay-closing-card-head">
                  <div>
                    <h3 className="stay-closing-card-title">
                      {row.establishment_name}
                    </h3>
                    <p className="stay-closing-card-meta text-sm text-muted">
                      {[
                        row.category
                          ? ESTABLISHMENT_CATEGORY_LABELS[row.category]
                          : null,
                        formatVisitDates(row.visit_dates),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {row.commission.commission_available ? (
                    <p className="stay-closing-rule text-sm">
                      {row.commission_summary}
                    </p>
                  ) : null}
                </div>

                <div className="stay-closing-fields">
                  <label className="stay-closing-field">
                    <span className="field-label">Approximate total bill</span>
                    <input
                      className="field-input"
                      value={row.approximate_total_bill}
                      onChange={(event) =>
                        updateRow(row.key, {
                          approximate_total_bill: event.target.value,
                        })
                      }
                      placeholder="e.g. 3500"
                      inputMode="decimal"
                      disabled={saving}
                    />
                  </label>

                  {row.show_premium_drinks ? (
                    <label className="stay-closing-field">
                      <span className="field-label">Premium drinks amount</span>
                      <input
                        className="field-input"
                        value={row.premium_drinks_amount}
                        onChange={(event) =>
                          updateRow(row.key, {
                            premium_drinks_amount: event.target.value,
                          })
                        }
                        placeholder="e.g. 2800"
                        inputMode="decimal"
                        disabled={saving}
                      />
                    </label>
                  ) : null}

                  <label className="stay-closing-field">
                    <span className="field-label">Notes</span>
                    <textarea
                      className="field-input stay-closing-notes"
                      value={row.internal_notes}
                      onChange={(event) =>
                        updateRow(row.key, {
                          internal_notes: event.target.value,
                        })
                      }
                      placeholder="Optional notes for this visit…"
                      rows={2}
                      disabled={saving}
                    />
                  </label>
                </div>

                {row.commission.commission_available ? (
                  <div className="stay-closing-commission" aria-live="polite">
                    <span className="stay-closing-commission-label">
                      Commission
                    </span>
                    <span
                      className={
                        row.commission_result.applied
                          ? "stay-closing-commission-value"
                          : "stay-closing-commission-muted"
                      }
                    >
                      {row.commission_result.amountLabel}
                    </span>
                    {row.commission_pending_season_target ? (
                      <span className="stay-closing-season-pending text-sm">
                        Pending Season Target
                      </span>
                    ) : null}
                    {row.commission_result.reason ? (
                      <span className="stay-closing-commission-reason text-sm text-muted">
                        {row.commission_result.reason}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}

        {rows.length > 0 ? (
          <div className="stay-closing-total" aria-live="polite">
            <span>Total commission</span>
            <strong>
              €
              {totalCommission.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-700 mt-3" role="alert">
            {error}
          </p>
        ) : null}

        <div className="est-dialog-actions stay-closing-actions">
          <button
            type="button"
            className="btn-secondary min-h-[44px]"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary min-h-[44px]"
            onClick={() => void handleSave()}
            disabled={saving || loading || rows.length === 0}
          >
            {saving ? "Saving…" : closedAt ? "Update closing" : "Save closing"}
          </button>
        </div>
      </div>
    </div>
  );
}
