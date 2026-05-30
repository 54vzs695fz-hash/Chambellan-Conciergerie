import { redirect } from "next/navigation";
import { createTrip } from "@/lib/db/trips";

export const dynamic = "force-dynamic";

export default function NewPlannerPage() {
  const trip = createTrip();
  redirect(`/planner/${trip.id}`);
}
