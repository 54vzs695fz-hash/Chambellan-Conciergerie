import { NextResponse } from "next/server";
import { createTrip, listTrips } from "@/lib/db/trips";

export async function GET() {
  return NextResponse.json(listTrips());
}

export async function POST() {
  const trip = createTrip();
  return NextResponse.json(trip, { status: 201 });
}
