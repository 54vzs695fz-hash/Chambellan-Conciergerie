import { NextRequest, NextResponse } from "next/server";
import { getBusinessDashboardSummary } from "@/lib/db/business-dashboard";
import type { BusinessDashboardFilter } from "@/lib/dashboard/business-season";

const VALID_FILTERS = new Set<BusinessDashboardFilter>([
  "current_season",
  "last_season",
  "year",
  "custom",
]);

export async function GET(req: NextRequest) {
  const filter = req.nextUrl.searchParams.get("filter") as BusinessDashboardFilter;
  const from = req.nextUrl.searchParams.get("from") ?? undefined;
  const to = req.nextUrl.searchParams.get("to") ?? undefined;

  if (!VALID_FILTERS.has(filter)) {
    return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
  }

  try {
    const summary = await getBusinessDashboardSummary(filter, from, to);
    if (!summary) {
      return NextResponse.json(
        { error: "Invalid custom date range" },
        { status: 400 }
      );
    }
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/dashboard/business failed:", err);
    return NextResponse.json(
      { error: "Could not load business dashboard" },
      { status: 500 }
    );
  }
}
