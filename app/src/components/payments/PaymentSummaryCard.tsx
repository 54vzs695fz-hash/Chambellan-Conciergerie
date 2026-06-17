"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildTripPaymentSummary,
  formatPaymentAmount,
  paymentSummaryCardClass,
} from "@/lib/planner/payment-summary";
import {
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/planner/payment-status";
import { PaymentStatusPicker } from "@/components/status/PaymentStatusPicker";
import type { Trip, TripPaymentMethod, TripPaymentStatus } from "@/lib/types";
import { PLANNER_AUTOSAVE_MS } from "@/components/planner/use-planner-save";

type PaymentFields = Pick<
  Trip,
  | "payment_status"
  | "total_amount"
  | "amount_received"
  | "payment_method"
  | "payment_notes"
>;

interface Props {
  trip: PaymentFields & { id: number; arrival_date?: string };
  saving?: boolean;
  paymentError?: string | null;
  onStatusChange: (status: TripPaymentStatus) => void;
  onFieldsChange: (fields: Partial<PaymentFields>) => void | Promise<void>;
  compact?: boolean;
}

export function PaymentSummaryCard({
  trip,
  saving = false,
  paymentError = null,
  onStatusChange,
  onFieldsChange,
  compact = false,
}: Props) {
  const [draft, setDraft] = useState({
    total_amount: trip.total_amount ?? "",
    amount_received: trip.amount_received ?? "",
    payment_method: (trip.payment_method ?? "") as TripPaymentMethod | "",
    payment_notes: trip.payment_notes ?? "",
    payment_status: trip.payment_status ?? "pending",
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<PaymentFields>>({});

  useEffect(() => {
    setDraft({
      total_amount: trip.total_amount ?? "",
      amount_received: trip.amount_received ?? "",
      payment_method: trip.payment_method ?? "",
      payment_notes: trip.payment_notes ?? "",
      payment_status: trip.payment_status ?? "pending",
    });
  }, [
    trip.id,
    trip.total_amount,
    trip.amount_received,
    trip.payment_method,
    trip.payment_notes,
    trip.payment_status,
  ]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const summary = useMemo(
    () =>
      buildTripPaymentSummary({
        payment_status: draft.payment_status,
        total_amount: draft.total_amount,
        amount_received: draft.amount_received,
        payment_method: draft.payment_method,
        payment_notes: draft.payment_notes,
      }),
    [draft]
  );

  const flush = (immediate = false) => {
    const payload = pendingRef.current;
    if (!payload || Object.keys(payload).length === 0) return;
    pendingRef.current = {};
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void onFieldsChange(payload);
    if (!immediate) return;
  };

  const queueField = (
    key: keyof PaymentFields,
    value: string,
    immediate = false
  ) => {
    pendingRef.current = { ...pendingRef.current, [key]: value };
    if (immediate) {
      flush(true);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flush(false), PLANNER_AUTOSAVE_MS);
  };

  const updateDraft = (
    patch: Partial<typeof draft>,
    options?: { immediate?: boolean; field?: keyof PaymentFields }
  ) => {
    setDraft((current) => ({ ...current, ...patch }));
    if (options?.field !== undefined) {
      queueField(
        options.field,
        String(patch[options.field as keyof typeof draft] ?? ""),
        options.immediate
      );
    }
  };

  return (
    <article
      className={`${paymentSummaryCardClass(summary.status)}${compact ? " pay-summary-card--compact" : ""}`}
      aria-label="Payment summary"
    >
      <header className="pay-summary-card-head">
        <div className="pay-summary-card-status">
          <PaymentStatusPicker
            status={summary.status}
            arrivalDate={trip.arrival_date}
            saving={saving}
            error={paymentError}
            onSelect={onStatusChange}
          />
        </div>
        <p
          className={`pay-summary-indicator pay-summary-indicator--${summary.indicatorTone}`}
        >
          {summary.indicator}
        </p>
      </header>

      <dl className="pay-summary-grid">
        <div className="pay-summary-row">
          <dt>Total amount</dt>
          <dd>
            <input
              className="pay-summary-input"
              value={draft.total_amount}
              onChange={(e) =>
                updateDraft({ total_amount: e.target.value }, {
                  field: "total_amount",
                })
              }
              onBlur={() => flush(true)}
              placeholder="e.g. 15000"
              inputMode="decimal"
              aria-label="Total amount"
            />
          </dd>
        </div>

        {summary.showAmountReceived ? (
          <div className="pay-summary-row">
            <dt>Amount received</dt>
            <dd>
              <input
                className="pay-summary-input"
                value={draft.amount_received}
                onChange={(e) =>
                  updateDraft({ amount_received: e.target.value }, {
                    field: "amount_received",
                  })
                }
                onBlur={() => flush(true)}
                placeholder="e.g. 5000"
                inputMode="decimal"
                aria-label="Amount received"
              />
            </dd>
          </div>
        ) : null}

        {summary.showRemainingBalance ? (
          <div className="pay-summary-row pay-summary-row--highlight">
            <dt>Remaining balance</dt>
            <dd className="pay-summary-value pay-summary-value--balance">
              {summary.remainingBalanceLabel}
            </dd>
          </div>
        ) : null}

        <div className="pay-summary-row">
          <dt>Payment method</dt>
          <dd>
            <select
              className="pay-summary-input pay-summary-select"
              value={draft.payment_method}
              onChange={(e) => {
                const value = e.target.value as TripPaymentMethod | "";
                updateDraft(
                  { payment_method: value },
                  {
                    field: "payment_method",
                    immediate: true,
                  }
                );
              }}
              aria-label="Payment method"
            >
              <option value="">Not set</option>
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </dd>
        </div>
      </dl>

      {!compact ? (
        <label className="pay-summary-notes">
          <span className="pay-summary-notes-label">Notes</span>
          <textarea
            className="pay-summary-textarea"
            value={draft.payment_notes}
            onChange={(e) =>
              updateDraft({ payment_notes: e.target.value }, {
                field: "payment_notes",
              })
            }
            onBlur={() => flush(true)}
            rows={2}
            placeholder="Internal payment notes…"
          />
        </label>
      ) : null}

      {summary.status === "fully_paid" ? (
        <p className="pay-summary-footnote pay-summary-footnote--paid">
          All payment tasks are marked complete.
        </p>
      ) : summary.remainingBalance !== null &&
        summary.remainingBalance > 0 ? (
        <p className="pay-summary-footnote">
          {formatPaymentAmount(summary.remainingBalance)} outstanding
        </p>
      ) : null}
    </article>
  );
}
