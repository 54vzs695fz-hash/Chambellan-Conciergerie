import { notFound } from "next/navigation";
import { PlannerEditor } from "@/components/planner/PlannerEditor";
import { listClients } from "@/lib/db/clients";
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
  const clients = listClients();

  return <PlannerEditor initialTrip={trip} clients={clients} />;
}
