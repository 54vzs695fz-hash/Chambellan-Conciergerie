import { NextRequest, NextResponse } from "next/server";
import { createEventVenue, listEventVenues } from "@/lib/db/event-venues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    return NextResponse.json(
      await listEventVenues({
        q: searchParams.get("q") ?? undefined,
        destination: searchParams.get("destination") ?? undefined,
        event_id: searchParams.get("event_id")
          ? Number(searchParams.get("event_id"))
          : undefined,
        prioritizeDestination:
          searchParams.get("prioritize_destination") ?? undefined,
        favoritesOnly: searchParams.get("favorites") === "1",
        limit: Number(searchParams.get("limit") ?? "100"),
      })
    );
  } catch (err) {
    console.error("GET /api/event-venues failed:", err);
    return NextResponse.json(
      { error: "Could not load event venues" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { validateEventVenueInput } = await import("@/lib/db/event-venues");
    const err = validateEventVenueInput(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const venue = await createEventVenue(body);
    return NextResponse.json(venue, { status: 201 });
  } catch (err) {
    console.error("POST /api/event-venues failed:", err);
    return NextResponse.json(
      { error: "Could not create event venue" },
      { status: 500 }
    );
  }
}
