import { prisma } from "@/lib/prisma";
import {
  buildBusinessCommissionRecords,
  computeBusinessDashboardSummary,
  countOutstandingCommissions,
  type BusinessCommissionRecord,
  type BusinessDashboardSummary,
} from "@/lib/dashboard/business-commissions";
import {
  resolveBusinessDateRange,
  type BusinessDashboardFilter,
} from "@/lib/dashboard/business-season";

async function loadCommissionRecords(): Promise<BusinessCommissionRecord[]> {
  const rows = await prisma.stayClosingEntry.findMany({
    where: { commission_applied: true },
    select: {
      id: true,
      establishment_id: true,
      establishment_name: true,
      calculated_commission: true,
      commission_applied: true,
      commission_received: true,
      commission_received_at: true,
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

  return buildBusinessCommissionRecords(
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
      calculated_commission: row.calculated_commission,
      commission_applied: row.commission_applied,
      commission_received: row.commission_received,
      commission_received_at: row.commission_received_at,
    }))
  );
}

export async function getBusinessDashboardSummary(
  filter: BusinessDashboardFilter,
  customStart?: string,
  customEnd?: string
): Promise<BusinessDashboardSummary | null> {
  const range = resolveBusinessDateRange(filter, customStart, customEnd);
  if (!range) return null;

  const records = await loadCommissionRecords();
  return computeBusinessDashboardSummary(records, range);
}

export async function getBusinessDashboardBadgeCount(): Promise<number> {
  const records = await loadCommissionRecords();
  return countOutstandingCommissions(records);
}

export async function markCommissionReceived(
  entryId: number,
  received: boolean
): Promise<boolean> {
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
