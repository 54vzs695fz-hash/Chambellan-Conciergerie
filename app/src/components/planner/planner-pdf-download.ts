import type { PlannerExportVariant } from "@/lib/planner/planner-sheet-model";
import { buildDefaultPlannerPdfFilename } from "@/lib/planner/planner-pdf-filename";

async function isPdfBlob(blob: Blob): Promise<boolean> {
  if (!blob.size) return false;
  if (blob.type.includes("pdf")) return true;
  const header = await blob.slice(0, 4).text();
  return header.startsWith("%PDF");
}

function triggerPdfDownload(blob: Blob, filename: string, apiUrl: string) {
  const blobUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(apiUrl, "_blank", "noopener,noreferrer");
    URL.revokeObjectURL(blobUrl);
  }
}

function canSharePdfFile(file: File): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function deliverPlannerPdf(
  blob: Blob,
  filename: string,
  apiUrl: string,
  options?: { preferShare?: boolean }
): Promise<void> {
  const file = new File([blob], filename, { type: "application/pdf" });

  if (options?.preferShare && canSharePdfFile(file)) {
    try {
      await navigator.share({
        files: [file],
        title: filename.replace(/\.pdf$/i, ""),
      });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  triggerPdfDownload(blob, filename, apiUrl);
}

export async function fetchPlannerPdf(
  tripId: number,
  mode: PlannerExportVariant
): Promise<{ blob: Blob; apiUrl: string }> {
  const apiUrl = `/api/trips/${tripId}/pdf?mode=${mode}`;
  const res = await fetch(apiUrl);

  if (!res.ok) {
    let message = "PDF generation failed. Please try again.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* response was not JSON */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  if (!(await isPdfBlob(blob))) {
    throw new Error(
      "PDF generation failed. The server did not return a valid PDF."
    );
  }

  return { blob, apiUrl };
}

export async function downloadPlannerPdf(
  tripId: number,
  mode: PlannerExportVariant,
  filename?: string,
  options?: { preferShare?: boolean; trip?: { destination?: string | null; client_name?: string | null } }
): Promise<void> {
  const { blob, apiUrl } = await fetchPlannerPdf(tripId, mode);
  const resolvedFilename =
    filename ??
    (options?.trip
      ? buildDefaultPlannerPdfFilename(mode, options.trip)
      : "Planner.pdf");

  await deliverPlannerPdf(blob, resolvedFilename, apiUrl, options);
}
