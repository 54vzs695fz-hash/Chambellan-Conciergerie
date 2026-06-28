import { prisma } from "@/lib/prisma";
import {
  getSeasonalDateRange,
  isCommissionPendingSeasonTarget,
  normalizeSeasonalCommission,
  sumSeasonClientSpend,
  type SeasonSpendEntry,
  type SeasonalCommissionFields,
} from "@/lib/establishments/seasonal-commission";
import { resolveReferenceDate } from "@/lib/stay-closing/utils";

export interface StayClosingSeasonalInput {
  establishment_id: number | null;
  establishment_name: string;
  approximate_total_bill: string;
  commission_applied: boolean;
  departure_date: string;
  closed_at: string;
}

export async function applySeasonalCommissionPendingFlags(
  entries: StayClosingSeasonalInput[],
  tripDepartureDate: string,
  closedAtIso: string,
  excludeStayClosingId?: number
): Promise<boolean[]> {
  const establishmentIds = [
    ...new Set(
      entries
        .map((entry) => entry.establishment_id)
        .filter((id): id is number => id !== null && id > 0)
    ),
  ];

  const seasonalByEstablishmentId = new Map<number, SeasonalCommissionFields>();
  if (establishmentIds.length) {
    const establishments = await prisma.establishment.findMany({
      where: { id: { in: establishmentIds } },
      select: {
        id: true,
        seasonal_commission_enabled: true,
        seasonal_commission_start: true,
        seasonal_commission_end: true,
        seasonal_commission_target: true,
        seasonal_commission_after_target: true,
      },
    });
    for (const row of establishments) {
      seasonalByEstablishmentId.set(
        row.id,
        normalizeSeasonalCommission(row)
      );
    }
  }

  const spendEntriesByEstablishment = new Map<number, SeasonSpendEntry[]>();
  if (establishmentIds.length) {
    const existingRows = await prisma.stayClosingEntry.findMany({
      where: {
        establishment_id: { in: establishmentIds },
        ...(excludeStayClosingId
          ? { stay_closing_id: { not: excludeStayClosingId } }
          : {}),
      },
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

    for (const row of existingRows) {
      if (!row.establishment_id) continue;
      const list = spendEntriesByEstablishment.get(row.establishment_id) ?? [];
      list.push({
        reference_date: resolveReferenceDate(
          row.stay_closing.trip.departure_date,
          row.stay_closing.closed_at.toISOString()
        ),
        approximate_total_bill: row.approximate_total_bill,
      });
      spendEntriesByEstablishment.set(row.establishment_id, list);
    }
  }

  return entries.map((entry) => {
    if (!entry.commission_applied || !entry.establishment_id) return false;

    const seasonal = seasonalByEstablishmentId.get(entry.establishment_id);
    if (!seasonal) return false;

    const season = getSeasonalDateRange(seasonal);
    if (!season) return false;

    const existingSpend =
      spendEntriesByEstablishment.get(entry.establishment_id) ?? [];
    const reference_date = resolveReferenceDate(
      tripDepartureDate || entry.departure_date,
      closedAtIso
    );
    const spendEntries: SeasonSpendEntry[] = [
      ...existingSpend,
      {
        reference_date,
        approximate_total_bill: entry.approximate_total_bill,
      },
    ];

    const currentSpend = sumSeasonClientSpend(spendEntries, season);
    return isCommissionPendingSeasonTarget(seasonal, currentSpend);
  });
}
