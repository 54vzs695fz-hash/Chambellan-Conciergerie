import { NextRequest, NextResponse } from "next/server";
import { createClient, listClients } from "@/lib/db/clients";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("q") ?? undefined;
  return NextResponse.json(listClients(search));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const client = createClient(body);
  return NextResponse.json(client, { status: 201 });
}
