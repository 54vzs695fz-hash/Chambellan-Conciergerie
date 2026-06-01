import Link from "next/link";
import { PlannerListClient } from "@/components/planner/PlannerListClient";
import { listTrips } from "@/lib/db/trips";

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

      <PlannerListClient initialTrips={trips} />
    </div>
  );
}
