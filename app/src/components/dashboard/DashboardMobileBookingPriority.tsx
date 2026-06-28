"use client";

import type { BookingPriorityItem } from "@/lib/dashboard/booking-priority";

interface Props {
  items: BookingPriorityItem[];
  onSelect: (tripId: number) => void;
}

export function DashboardMobileBookingPriority({ items, onSelect }: Props) {
  return (
    <section className="dash-mobile-section" data-section="planner">
      <header className="dash-mobile-section-head">
        <h2 className="dash-mobile-section-title">Booking priority</h2>
        {items.length > 0 ? (
          <span className="dash-mobile-section-count">{items.length}</span>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="dash-mobile-empty">
          No confirmed programmes with bookings yet.
        </p>
      ) : (
        <ul className="dash-mobile-priority-list">
          {items.map((item) => (
            <li key={item.tripId}>
              <button
                type="button"
                className={`dash-mobile-priority-card dash-mobile-priority-card--${item.priority}`}
                onClick={() => onSelect(item.tripId)}
              >
                <span className="dash-mobile-priority-client">
                  {item.client_name}
                </span>
                <span className="dash-mobile-priority-destination">
                  {item.destination}
                </span>
                {item.destination_subtitle ? (
                  <span className="dash-mobile-priority-destination-sub">
                    {item.destination_subtitle}
                  </span>
                ) : null}
                {item.dates ? (
                  <span className="dash-mobile-priority-dates">{item.dates}</span>
                ) : null}
                {item.guest_label ? (
                  <span className="dash-mobile-priority-guests">
                    {item.guest_label}
                  </span>
                ) : null}

                <div className="dash-mobile-priority-progress">
                  <div
                    className="bp-card-progress-track"
                    role="progressbar"
                    aria-valuenow={item.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.percent}% confirmed`}
                  >
                    <div
                      className={`bp-card-progress-bar bp-card-progress-bar--${item.progressTone}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>

                <span className="dash-mobile-priority-remaining">
                  {item.remaining_label}
                </span>

                <span
                  className={`dash-mobile-priority-badge dash-mobile-priority-badge--${item.priority}`}
                >
                  {item.priority_emoji} {item.priority_label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
