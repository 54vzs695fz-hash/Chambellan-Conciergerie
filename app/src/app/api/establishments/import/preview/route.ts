import { NextResponse } from "next/server";
import { getExistingEstablishmentKeys } from "@/lib/db/establishments";
import { getExistingEventKeys } from "@/lib/db/events";
import {
  buildImportPreview,
  fetchWebsiteEstablishments,
} from "@/lib/establishments/website-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [websiteRows, existingEstablishmentKeys, existingEventKeys] =
      await Promise.all([
        fetchWebsiteEstablishments(),
        getExistingEstablishmentKeys(),
        getExistingEventKeys(),
      ]);
    const rows = buildImportPreview(
      websiteRows,
      existingEstablishmentKeys,
      existingEventKeys
    );
    const summary = {
      total: rows.length,
      new: rows.filter((r) => r.status === "new").length,
      exists: rows.filter((r) => r.status === "exists").length,
      duplicate_batch: rows.filter((r) => r.status === "duplicate_batch").length,
    };
    return NextResponse.json({ rows, summary });
  } catch (err) {
    console.error("GET /api/establishments/import/preview failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not load website establishments",
      },
      { status: 500 }
    );
  }
}
