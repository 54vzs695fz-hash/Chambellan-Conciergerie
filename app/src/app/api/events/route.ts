import { NextRequest, NextResponse } from "next/server";
import { createEvent, listEvents } from "@/lib/db/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    return NextResponse.json(
      await listEvents({
        q: searchParams.get("q") ?? undefined,
        category: searchParams.get("category") ?? undefined,
        destination: searchParams.get("destination") ?? undefined,
        prioritizeDestination:
          searchParams.get("prioritize_destination") ?? undefined,
        favoritesOnly: searchParams.get("favorites") === "1",
        limit: Number(searchParams.get("limit") ?? "100"),
      })
    );
  } catch (err) {
    console.error("GET /api/events failed:", err);
    return NextResponse.json({ error: "Could not load events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { validateEventInput } = await import("@/lib/db/events");
    const err = validateEventInput(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const event = await createEvent(body);
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error("POST /api/events failed:", err);
    return NextResponse.json({ error: "Could not create event" }, { status: 500 });
  }
}
