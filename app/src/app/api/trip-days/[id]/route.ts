import { NextRequest, NextResponse } from "next/server";
import { updateTripDay } from "@/lib/db/trips";
import type { DaySection } from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const sections = body.sections as DaySection[] | undefined;
  const destinationOverride =
    typeof body.destination_override === "string"
      ? body.destination_override
      : undefined;

  if (sections !== undefined && !Array.isArray(sections)) {
    return NextResponse.json({ error: "Invalid sections" }, { status: 400 });
  }

  const day = await updateTripDay(Number(id), {
    sections,
    destination_override: destinationOverride,
  });
  if (!day) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(day);
}
