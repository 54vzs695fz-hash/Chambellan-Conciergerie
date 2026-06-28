import { NextResponse } from "next/server";
import { getClientBusinessStays } from "@/lib/db/client-business";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }

  const stays = await getClientBusinessStays(clientId);
  return NextResponse.json({ stays });
}
