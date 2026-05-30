import { NextRequest, NextResponse } from "next/server";
import { getTrip } from "@/lib/db/trips";
import { generatePlannerPdf } from "@/lib/pdf/generate-planner-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);
  const trip = getTrip(tripId);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const mode = req.nextUrl.searchParams.get("mode") === "concierge"
    ? "concierge"
    : "client";

  try {
    const buffer = await generatePlannerPdf(tripId, mode, req.nextUrl.origin);
    const safeName = (trip.client_name || "Client")
      .replace(/[^\w\s-]/g, "")
      .trim();
    const filename = `Weekly Planner - ${safeName || "Client"}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(`Weekly Planner — ${trip.client_name || "Client"}.pdf`)}`,
      },
    });
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
