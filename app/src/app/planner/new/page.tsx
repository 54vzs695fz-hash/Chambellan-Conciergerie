import { redirect } from "next/navigation";
import { createTrip } from "@/lib/db/trips";
import { isMobileQuickAddKind } from "@/lib/mobile/planner-quick-add";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ quickAdd?: string }>;
}) {
  const trip = await createTrip();
  const params = await searchParams;
  const quickAdd = params.quickAdd?.trim() ?? "";
  if (isMobileQuickAddKind(quickAdd)) {
    redirect(`/planner/${trip.id}?quickAdd=${quickAdd}`);
  }
  redirect(`/planner/${trip.id}`);
}
