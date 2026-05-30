async function isPdfBlob(blob: Blob): Promise<boolean> {
  if (!blob.size) return false;
  if (blob.type.includes("pdf")) return true;
  const header = await blob.slice(0, 4).text();
  return header.startsWith("%PDF");
}

function triggerPdfDownload(blob: Blob, filename: string, apiUrl: string) {
  const blobUrl = URL.createObjectURL(blob);
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  try {
    if (isIOS) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }

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

export async function downloadPlannerPdf(
  tripId: number,
  mode: "client" | "concierge"
): Promise<void> {
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

  const disposition = res.headers.get("Content-Disposition");
  let filename = "Weekly Planner - Client.pdf";
  if (disposition) {
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;\n]+)/i);
    const asciiMatch = disposition.match(/filename="([^"]+)"/i);
    if (utfMatch?.[1]) filename = decodeURIComponent(utfMatch[1]);
    else if (asciiMatch?.[1]) filename = asciiMatch[1];
  }

  triggerPdfDownload(blob, filename, apiUrl);
}
