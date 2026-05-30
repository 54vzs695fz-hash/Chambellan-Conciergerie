import { NextRequest, NextResponse } from "next/server";
import { addActivity } from "@/lib/db/trips";
import type { ActivityPeriod, ActivityType } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const body = await req.json();
  const activity = await addActivity(
    Number(body.trip_day_id),
    body.period as ActivityPeriod,
    (body.activity_type as ActivityType) ?? "activity"
  );
  return NextResponse.json(activity, { status: 201 });
}
