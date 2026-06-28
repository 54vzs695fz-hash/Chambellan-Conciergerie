import Link from "next/link";
import type { TodayActionGroup } from "@/lib/dashboard/home-today";

const KIND_CLASS: Record<TodayActionGroup["kind"], string> = {
  arrival: "dash-mobile-today-item--arrival",
  departure: "dash-mobile-today-item--departure",
  booking_request: "dash-mobile-today-item--request",
  waiting_confirmation: "dash-mobile-today-item--waiting",
  pending_transfer: "dash-mobile-today-item--transfer",
  pending_payment: "dash-mobile-today-item--payment",
};

interface Props {
  groups: TodayActionGroup[];
}

export function DashboardMobileToday({ groups }: Props) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="dash-mobile-section" data-section="calendar">
      <header className="dash-mobile-section-head">
        <h2 className="dash-mobile-section-title">Today</h2>
        {total > 0 ? (
          <span className="dash-mobile-section-count">{total}</span>
        ) : null}
      </header>

      {total === 0 ? (
        <p className="dash-mobile-empty">
          All clear — nothing urgent for today.
        </p>
      ) : (
        <div className="dash-mobile-today-groups">
          {groups.map((group) => (
            <div key={group.kind} className="dash-mobile-today-group">
              <h3 className="dash-mobile-today-group-label">{group.label}</h3>
              <ul className="dash-mobile-today-list">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`dash-mobile-today-item ${KIND_CLASS[item.kind]}`}
                    >
                      <span className="dash-mobile-today-item-title">
                        {item.title}
                      </span>
                      <span className="dash-mobile-today-item-subtitle">
                        {item.subtitle}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
