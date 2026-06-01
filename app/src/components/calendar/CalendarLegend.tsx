"use client";

import { useState } from "react";
import {
  PAYMENT_STATUS_DOT,
  PROGRAMME_STATUS_DOT,
} from "@/lib/calendar/display-utils";
import {
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_STATUS_OPTIONS,
} from "@/lib/calendar/status-styles";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
} from "@/lib/planner/payment-status";

interface Props {
  collapsible?: boolean;
}

export function CalendarLegend({ collapsible = false }: Props) {
  const [open, setOpen] = useState(!collapsible);

  if (!collapsible) {
    return (
      <div className="cal-legend" aria-label="Status legend">
        <LegendContent />
      </div>
    );
  }

  return (
    <div className="cal-legend cal-legend--collapsible">
      <button
        type="button"
        className="cal-legend-toggle min-h-[44px]"
        aria-expanded={open}
        aria-controls="cal-legend-content"
        onClick={() => setOpen((value) => !value)}
      >
        <span>Legend</span>
        <span className="cal-legend-chevron" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div id="cal-legend-content" className="cal-legend-body">
          <LegendContent />
        </div>
      ) : null}
    </div>
  );
}

function LegendContent() {
  return (
    <>
      <div className="cal-legend-row">
        <span className="cal-legend-group">Programme:</span>
        <ul className="cal-legend-items">
          {FOLLOW_UP_STATUS_OPTIONS.map((status) => (
            <li key={status} className="cal-legend-item">
              <span
                className={`cal-dot cal-dot--legend ${PROGRAMME_STATUS_DOT[status]}`}
                aria-hidden
              />
              {FOLLOW_UP_STATUS_LABELS[status]}
            </li>
          ))}
        </ul>
      </div>
      <div className="cal-legend-row">
        <span className="cal-legend-group">Payment:</span>
        <ul className="cal-legend-items">
          {PAYMENT_STATUS_OPTIONS.map((status) => (
            <li key={status} className="cal-legend-item">
              <span
                className={`cal-dot cal-dot--legend ${PAYMENT_STATUS_DOT[status]}`}
                aria-hidden
              />
              {PAYMENT_STATUS_LABELS[status]}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
