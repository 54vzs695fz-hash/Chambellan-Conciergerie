import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePaymentAmount } from "@/lib/planner/payment-summary";
import {
  updateStayClosingEntryNotes,
  updateStayClosingEntryStatus,
} from "@/lib/db/client-business";
import {
  commissionDisplayStatusLabel,
  resolveCommissionDisplayStatus,
  type CommissionDisplayStatus,
} from "@/lib/stay-closing/commission-status";
import {
  isCommissionPendingSeasonTarget,
  normalizeSeasonalCommission,
  sumSeasonClientSpend,
  getSeasonalDateRange,
} from "@/lib/establishments/seasonal-commission";
import { resolveReferenceDate } from "@/lib/stay-closing/utils";

export const runtime = "nodejs";

function resolvePayableCommission(input: {
  commission_applied: boolean;
  commission_amount: number;
  commission_received: boolean;
  commission_pending_season_target: boolean;
}): boolean {
  return (
    input.commission_applied &&
    input.commission_amount > 0 &&
    !input.commission_received &&
    !input.commission_pending_season_target
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = Number(id);
  if (!Number.isFinite(entryId) || entryId <= 0) {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    status?: CommissionDisplayStatus;
    notes?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.notes !== undefined) {
    const ok = await updateStayClosingEntryNotes(entryId, body.notes);
    if (!ok) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
  }

  if (body.status !== undefined) {
    const ok = await updateStayClosingEntryStatus(entryId, body.status);
    if (!ok) {
      return NextResponse.json(
        { error: "Could not update status" },
        { status: 400 }
      );
    }
  }

  const entry = await prisma.stayClosingEntry.findUnique({
    where: { id: entryId },
    include: {
      establishment: {
        select: {
          seasonal_commission_enabled: true,
          seasonal_commission_start: true,
          seasonal_commission_end: true,
          seasonal_commission_target: true,
          seasonal_commission_after_target: true,
        },
      },
      stay_closing: {
        select: {
          closed_at: true,
          trip: { select: { departure_date: true } },
        },
      },
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const commission_amount = parsePaymentAmount(entry.calculated_commission) ?? 0;
  const seasonal = normalizeSeasonalCommission(entry.establishment ?? {});
  const season = getSeasonalDateRange(seasonal);
  let pendingSeason = entry.commission_pending_season_target;

  if (entry.establishment_id && season) {
    const seasonRows = await prisma.stayClosingEntry.findMany({
      where: { establishment_id: entry.establishment_id },
      select: {
        approximate_total_bill: true,
        stay_closing: {
          select: {
            closed_at: true,
            trip: { select: { departure_date: true } },
          },
        },
      },
    });
    const spend = sumSeasonClientSpend(
      seasonRows.map((row) => ({
        reference_date: resolveReferenceDate(
          row.stay_closing.trip.departure_date,
          row.stay_closing.closed_at.toISOString()
        ),
        approximate_total_bill: row.approximate_total_bill,
      })),
      season
    );
    pendingSeason = isCommissionPendingSeasonTarget(seasonal, spend);
  }

  const status = resolveCommissionDisplayStatus({
    commission_applied: entry.commission_applied,
    commission_amount,
    commission_received: entry.commission_received,
  });

  return NextResponse.json({
    status,
    status_label: commissionDisplayStatusLabel(status),
    notes: entry.internal_notes,
    commission_received: entry.commission_received,
    commission_payable: resolvePayableCommission({
      commission_applied: entry.commission_applied,
      commission_amount,
      commission_received: entry.commission_received,
      commission_pending_season_target: pendingSeason,
    }),
  });
}
