import Link from "next/link";
import { DashboardCalendarWidget } from "@/components/calendar/DashboardCalendarWidget";
import { DashboardFollowUpSummary } from "@/components/dashboard/DashboardFollowUpSummary";
import { DashboardPaymentSummary } from "@/components/dashboard/DashboardPaymentSummary";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import { listDashboardFollowUpItems } from "@/lib/db/checklist";
import { listClients } from "@/lib/db/clients";
import { listTrips } from "@/lib/db/trips";
import { formatDateRange } from "@/lib/planner-utils";
import "@/app/calendar/calendar.css";
import "@/app/dashboard.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const allTrips = await listTrips();
  const trips = allTrips.slice(0, 6);
  const clients = (await listClients()).slice(0, 5);
  const pendingFollowUp = await listDashboardFollowUpItems();

  return (
    <div className="page-shell max-w-4xl">
      <header className="mb-10">
        <h1 className="font-serif text-3xl tracking-wide text-ink mb-2">
          Chambellan Concierge
        </h1>
        <p className="text-sm text-muted max-w-md">
          Your private operating system for weekly programmes, client profiles,
          and luxury PDF itineraries.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 mb-12">
        <Link href="/planner/new" className="dash-action dash-action--follow-up">
          New weekly planner
        </Link>
        <Link href="/clients/new" className="dash-action dash-action--confirmed">
          New client
        </Link>
        <Link href="/establishments/new" className="dash-action dash-action--library">
          New establishment
        </Link>
      </div>

      <DashboardCalendarWidget trips={allTrips} />

      <DashboardPaymentSummary trips={allTrips} />

      <DashboardFollowUpSummary initialItems={pendingFollowUp} />

      <section className="mb-10" data-section="planner">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent planners</h2>
          <Link href="/planner" className="btn-ghost">
            View all
          </Link>
        </div>
        {trips.length === 0 ? (
          <p className="text-sm text-muted">No planners yet.</p>
        ) : (
          <ul className="space-y-2">
            {trips.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/planner/${t.id}`}
                  className="dash-card dash-card--confirmed dash-list-link"
                >
                  <div className="dash-planner-row">
                    <div className="dash-planner-meta">
                      <span className="font-serif text-gold tracking-wide">
                        {t.destination || "Untitled"}
                      </span>
                      <span className="text-muted mx-2">·</span>
                      <span className="text-sm">{t.client_name || "Client"}</span>
                      <p className="text-xs text-muted mt-1">
                        {formatDateRange(t.arrival_date, t.departure_date)}
                      </p>
                    </div>
                    <ProgrammeStatusBadge
                      status={t.follow_up_status ?? "follow_up"}
                      showDot
                      arrivalDate={t.arrival_date}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-section="clients">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Clients</h2>
          <Link href="/clients" className="btn-ghost">
            View all
          </Link>
        </div>
        {clients.length === 0 ? (
          <p className="text-sm text-muted">No clients yet.</p>
        ) : (
          <ul className="space-y-2">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="dash-card dash-card--confirmed dash-list-link text-sm"
                >
                  {c.full_name}
                  {c.nationality ? (
                    <span className="text-muted ml-2">· {c.nationality}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
