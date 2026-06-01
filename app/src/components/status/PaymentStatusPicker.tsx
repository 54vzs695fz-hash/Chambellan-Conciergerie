"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  needsPaymentWarning,
  paymentBadgeClass,
} from "@/lib/planner/payment-status";
import { PAYMENT_STATUS_DOT } from "@/lib/calendar/display-utils";
import type { TripPaymentStatus } from "@/lib/types";

interface Props {
  status: TripPaymentStatus;
  arrivalDate?: string;
  saving?: boolean;
  error?: string | null;
  onSelect: (status: TripPaymentStatus) => void;
  className?: string;
}

export function PaymentStatusPicker({
  status,
  arrivalDate,
  saving = false,
  error = null,
  onSelect,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const warning =
    !!arrivalDate && needsPaymentWarning(arrivalDate, status);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  useEffect(() => {
    if (saving) setOpen(false);
  }, [saving]);

  const stop = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={rootRef}
      className={`pay-status-picker${open ? " is-open" : ""} ${className}`.trim()}
    >
      <button
        type="button"
        className={`pay-status-picker-trigger min-h-[44px] ${paymentBadgeClass(status)}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={saving}
        onClick={(event) => {
          stop(event);
          setOpen((value) => !value);
        }}
      >
        <span
          className={`cal-dot ${PAYMENT_STATUS_DOT[status]}${warning ? " cal-dot--warn-ring" : ""}`}
          aria-hidden
          title={
            warning ? "Payment pending — arrival within 7 days" : undefined
          }
        />
        <span className="pay-status-picker-label">
          {PAYMENT_STATUS_LABELS[status]}
        </span>
        <span className="pay-status-picker-chevron" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          className="pay-status-menu"
          role="listbox"
          aria-label="Payment status"
          onClick={stop}
        >
          {PAYMENT_STATUS_OPTIONS.map((option) => (
            <li key={option} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={status === option}
                className={`pay-status-menu-item min-h-[44px] ${paymentBadgeClass(option)}${status === option ? " is-selected" : ""}`}
                onClick={(event) => {
                  stop(event);
                  setOpen(false);
                  if (option !== status) onSelect(option);
                }}
              >
                <span
                  className={`cal-dot ${PAYMENT_STATUS_DOT[option]}`}
                  aria-hidden
                />
                {PAYMENT_STATUS_LABELS[option]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {saving ? (
        <span className="pay-status-saving" role="status">
          <span className="pay-status-spinner" aria-hidden />
          Saving…
        </span>
      ) : null}

      {error ? (
        <span className="pay-status-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
