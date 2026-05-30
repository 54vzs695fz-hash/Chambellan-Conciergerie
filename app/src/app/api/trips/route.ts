import { NextResponse } from "next/server";
import { createTrip, listTrips } from "@/lib/db/trips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listTrips());
}

export async function POST() {
  const trip = await createTrip();
  return NextResponse.json(trip, { status: 201 });
}
