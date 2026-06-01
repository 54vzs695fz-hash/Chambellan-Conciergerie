import Link from "next/link";
import { PlannerListClient } from "@/components/planner/PlannerListClient";
import { listTrips } from "@/lib/db/trips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PlannerListPage() {
  const trips = await listTrips();

  return (
    <div className="page-shell max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">Weekly Planner</h1>
          <p className="text-sm text-muted mt-1">All programmes</p>
        </div>
        <div className="page-header-actions">
          <Link href="/planner/new" className="btn-primary min-h-[44px]">
            New planner
          </Link>
        </div>
      </div>

      <PlannerListClient initialTrips={trips} />
    </div>
  );
}
