import { notFound } from "next/navigation";
import { PlannerEditor } from "@/components/planner/PlannerEditor";
import { getTrip } from "@/lib/db/trips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PlannerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = getTrip(Number(id));
  if (!trip) notFound();

  return <PlannerEditor initialTrip={trip} />;
}
