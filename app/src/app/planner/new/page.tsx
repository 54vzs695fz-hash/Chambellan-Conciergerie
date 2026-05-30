import { redirect } from "next/navigation";
import { createTrip } from "@/lib/db/trips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewPlannerPage() {
  const trip = await createTrip();
  redirect(`/planner/${trip.id}`);
}
