import type { TripWithDays } from "@/lib/types";
import type { PlannerExportVariant } from "@/lib/planner/planner-sheet-model";
import { PlannerLuxuryDocument } from "./PlannerLuxuryDocument";

export function PlannerDocument({
  trip,
  variant = "client",
}: {
  trip: TripWithDays;
  variant?: PlannerExportVariant;
}) {
  return <PlannerLuxuryDocument trip={trip} variant={variant} />;
}
