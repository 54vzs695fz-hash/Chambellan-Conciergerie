import Link from "next/link";
import { listTrips } from "@/lib/db/trips";
import { formatDateRange } from "@/lib/planner-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PlannerListPage() {
  const trips = await listTrips();

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">Weekly Planner</h1>
          <p className="text-sm text-muted mt-1">All programmes</p>
        </div>
        <Link href="/planner/new" className="btn-primary">
          New planner
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="text-muted text-sm">Create your first weekly planner.</p>
      ) : (
        <ul className="space-y-2 max-w-2xl">
          {trips.map((t) => (
            <li key={t.id}>
              <Link
                href={`/planner/${t.id}`}
                className="card flex items-center justify-between px-5 py-4 hover:border-gold/40"
              >
                <div>
                  <p className="font-serif text-gold tracking-wide">
                    {t.destination || "Untitled destination"}
                  </p>
                  <p className="text-sm mt-0.5">{t.client_name}</p>
                </div>
                <p className="text-xs text-muted text-right">
                  {formatDateRange(t.arrival_date, t.departure_date)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
