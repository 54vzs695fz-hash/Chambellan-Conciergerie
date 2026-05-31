import { notFound } from "next/navigation";
import { PlannerLuxuryDocument } from "@/components/planner/PlannerLuxuryDocument";
import { PlannerPrintLayoutLock } from "@/components/planner/PlannerPrintLayoutLock";
import { getTrip } from "@/lib/db/trips";
import type { PlannerExportVariant } from "@/lib/planner/planner-sheet-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PlannerPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const trip = await getTrip(Number(id));
  if (!trip) notFound();

  const variant: PlannerExportVariant =
    mode === "concierge" ? "concierge" : "client";

  return (
    <>
      <style>{`html, body { height: 100%; margin: 0; padding: 0; }`}</style>
      <div className={`lux-print-root lux-print-root--capture lux-print-root--${variant}`}>
        <PlannerPrintLayoutLock />
        <PlannerLuxuryDocument trip={trip} variant={variant} />
      </div>
    </>
  );
}
