import type { PlannerExportVariant } from "./planner-sheet-model";

const FORBIDDEN_FILENAME_CHARS = /[/\\:*?"<>|]/g;

export function sanitizePdfFilename(raw: string): string {
  let name = String(raw ?? "")
    .replace(FORBIDDEN_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!name) return "Planner.pdf";

  if (!/\.pdf$/i.test(name)) {
    name = `${name.replace(/\.+$/, "")}.pdf`;
  }

  const stem = name.slice(0, -4).trim();
  if (!stem) return "Planner.pdf";

  return `${stem}.pdf`;
}

export function buildDefaultPlannerPdfFilename(
  mode: PlannerExportVariant,
  trip: { destination?: string | null; client_name?: string | null }
): string {
  const destination = String(trip.destination ?? "").trim() || "Untitled";
  const clientName = String(trip.client_name ?? "").trim() || "Client";
  const suffix =
    mode === "client" ? "Client Planner.pdf" : "Concierge Planner.pdf";
  return sanitizePdfFilename(`${destination} - ${clientName} - ${suffix}`);
}
