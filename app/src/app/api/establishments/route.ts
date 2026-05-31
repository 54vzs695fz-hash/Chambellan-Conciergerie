import { NextRequest, NextResponse } from "next/server";
import {
  createEstablishment,
  listEstablishments,
} from "@/lib/db/establishments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const city = searchParams.get("city") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? "50");
    return NextResponse.json(
      await listEstablishments({ q, category, city, limit })
    );
  } catch (err) {
    console.error("GET /api/establishments failed:", err);
    return NextResponse.json(
      { error: "Could not load establishments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    const establishment = await createEstablishment(body);
    return NextResponse.json(establishment, { status: 201 });
  } catch (err) {
    console.error("POST /api/establishments failed:", err);
    return NextResponse.json(
      { error: "Could not create establishment" },
      { status: 500 }
    );
  }
}
