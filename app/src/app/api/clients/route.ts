import { NextRequest, NextResponse } from "next/server";
import { createClient, listClients } from "@/lib/db/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("q") ?? undefined;
    return NextResponse.json(await listClients(search));
  } catch (err) {
    console.error("GET /api/clients failed:", err);
    return NextResponse.json(
      { error: "Could not load clients" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const client = await createClient(body);
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error("POST /api/clients failed:", err);
    return NextResponse.json(
      { error: "Could not create client" },
      { status: 500 }
    );
  }
}
