import Link from "next/link";
import { listClients } from "@/lib/db/clients";
import { listTrips } from "@/lib/db/trips";
import { formatDateRange } from "@/lib/planner-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const trips = listTrips().slice(0, 6);
  const clients = listClients().slice(0, 5);

  return (
    <div className="p-10 max-w-4xl">
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
        <Link href="/planner/new" className="btn-primary">
          New weekly planner
        </Link>
        <Link href="/clients/new" className="btn-secondary">
          New client
        </Link>
      </div>

      <section className="mb-10">
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
                  className="card block px-5 py-4 hover:border-gold/40 transition-colors"
                >
                  <span className="font-serif text-gold tracking-wide">
                    {t.destination || "Untitled"}
                  </span>
                  <span className="text-muted mx-2">·</span>
                  <span className="text-sm">{t.client_name || "Client"}</span>
                  <p className="text-xs text-muted mt-1">
                    {formatDateRange(t.arrival_date, t.departure_date)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
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
                  className="card block px-5 py-3 hover:border-gold/40 transition-colors text-sm"
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
