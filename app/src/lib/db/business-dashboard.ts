import { prisma } from "@/lib/prisma";
import {
  buildSeasonalPartnerSummaries,
  computeBusinessDashboardSummary,
  countOutstandingCommissions,
  enrichRecordsWithSeasonalStatus,
  type BusinessCommissionRecord,
  type BusinessDashboardSummary,
} from "@/lib/dashboard/business-commissions";
import {
  resolveBusinessDateRange,
  type BusinessDashboardFilter,
} from "@/lib/dashboard/business-season";
import { normalizeSeasonalCommission } from "@/lib/establishments/seasonal-commission";

async function loadCommissionRecords(): Promise<BusinessCommissionRecord[]> {
  const spendRows = await prisma.stayClosingEntry.findMany({
    where: { establishment_id: { not: null } },
    select: {
      establishment_id: true,
      approximate_total_bill: true,
      stay_closing: {
        select: {
          closed_at: true,
          trip: { select: { departure_date: true } },
        },
      },
    },
  });

  const spendPayload = spendRows.map((row) => ({
    establishment_id: row.establishment_id,
    approximate_total_bill: row.approximate_total_bill,
    departure_date: row.stay_closing.trip.departure_date,
    closed_at: row.stay_closing.closed_at.toISOString(),
  }));

  const rows = await prisma.stayClosingEntry.findMany({
    where: { commission_applied: true },
    select: {
      id: true,
      establishment_id: true,
      establishment_name: true,
      approximate_total_bill: true,
      calculated_commission: true,
      commission_applied: true,
      commission_received: true,
      commission_received_at: true,
      commission_pending_season_target: true,
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
          trip: {
            select: {
              id: true,
              client_id: true,
              client_name: true,
              destination: true,
              departure_date: true,
            },
          },
        },
      },
    },
  });

  return enrichRecordsWithSeasonalStatus(
    rows.map((row) => ({
      entry_id: row.id,
      trip_id: row.stay_closing.trip.id,
      client_id: row.stay_closing.trip.client_id,
      client_name: row.stay_closing.trip.client_name,
      destination: row.stay_closing.trip.destination,
      departure_date: row.stay_closing.trip.departure_date,
      closed_at: row.stay_closing.closed_at.toISOString(),
      establishment_id: row.establishment_id,
      establishment_name: row.establishment_name,
      approximate_total_bill: row.approximate_total_bill,
      calculated_commission: row.calculated_commission,
      commission_applied: row.commission_applied,
      commission_received: row.commission_received,
      commission_received_at: row.commission_received_at,
      commission_pending_season_target: row.commission_pending_season_target,
      seasonal: row.establishment ?? undefined,
    })),
    spendPayload
  );
}

async function loadSeasonalPartners(
  records: BusinessCommissionRecord[]
): Promise<
  Array<{
    establishment_id: number;
    establishment_name: string;
    seasonal: ReturnType<typeof normalizeSeasonalCommission>;
  }>
> {
  const establishmentIds = [
    ...new Set(
      records
        .map((record) => record.establishment_id)
        .filter((id): id is number => id !== null && id > 0)
    ),
  ];

  if (!establishmentIds.length) return [];

  const rows = await prisma.establishment.findMany({
    where: {
      id: { in: establishmentIds },
      seasonal_commission_enabled: true,
    },
    select: {
      id: true,
      name: true,
      seasonal_commission_enabled: true,
      seasonal_commission_start: true,
      seasonal_commission_end: true,
      seasonal_commission_target: true,
      seasonal_commission_after_target: true,
    },
  });

  return rows.map((row) => ({
    establishment_id: row.id,
    establishment_name: row.name,
    seasonal: normalizeSeasonalCommission(row),
  }));
}

export async function getBusinessDashboardSummary(
  filter: BusinessDashboardFilter,
  customStart?: string,
  customEnd?: string
): Promise<BusinessDashboardSummary | null> {
  const range = resolveBusinessDateRange(filter, customStart, customEnd);
  if (!range) return null;

  const records = await loadCommissionRecords();
  const spendRows = await prisma.stayClosingEntry.findMany({
    where: { establishment_id: { not: null } },
    select: {
      establishment_id: true,
      approximate_total_bill: true,
      stay_closing: {
        select: {
          closed_at: true,
          trip: { select: { departure_date: true } },
        },
      },
    },
  });
  const spendPayload = spendRows.map((row) => ({
    establishment_id: row.establishment_id,
    approximate_total_bill: row.approximate_total_bill,
    departure_date: row.stay_closing.trip.departure_date,
    closed_at: row.stay_closing.closed_at.toISOString(),
  }));
  const seasonalPartners = buildSeasonalPartnerSummaries(
    records,
    await loadSeasonalPartners(records),
    spendPayload
  );
  return computeBusinessDashboardSummary(records, range, seasonalPartners);
}

export async function getBusinessDashboardBadgeCount(): Promise<number> {
  const records = await loadCommissionRecords();
  return countOutstandingCommissions(records);
}

export async function markCommissionReceived(
  entryId: number,
  received: boolean
): Promise<boolean> {
  const records = await loadCommissionRecords();
  const record = records.find((row) => row.entry_id === entryId);
  if (!record) return false;
  if (received && !record.commission_payable) return false;

  try {
    await prisma.stayClosingEntry.update({
      where: { id: entryId },
      data: {
        commission_received: received,
        commission_received_at: received ? new Date().toISOString().slice(0, 10) : "",
      },
    });
    return true;
  } catch {
    return false;
  }
}

export { loadCommissionRecords };
