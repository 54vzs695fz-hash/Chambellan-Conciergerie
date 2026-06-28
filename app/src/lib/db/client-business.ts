import { prisma } from "@/lib/prisma";
import { parsePaymentAmount } from "@/lib/planner/payment-summary";
import {
  buildEstablishmentSeasonProgress,
  getSeasonalDateRange,
  isCommissionPendingSeasonTarget,
  normalizeSeasonalCommission,
  sumSeasonClientSpend,
  type SeasonSpendEntry,
} from "@/lib/establishments/seasonal-commission";
import { normalizeEstablishmentCommission } from "@/lib/establishments/commission";
import {
  collectVisitedEstablishmentsFromTrip,
  buildEstablishmentLookup,
} from "@/lib/stay-closing/visited-establishments";
import { getStayClosingFieldRequirements } from "@/lib/stay-closing/field-requirements";
import {
  commissionDisplayStatusLabel,
  resolveCommissionDisplayStatus,
  type CommissionDisplayStatus,
} from "@/lib/stay-closing/commission-status";
import { resolveReferenceDate, formatMoney } from "@/lib/stay-closing/utils";
import { listEstablishments } from "@/lib/db/establishments";
import { buildTripWithDays } from "@/lib/db/client-stay-history";
import type { ClientBusinessStay, ClientBusinessEstablishment } from "@/lib/types";

async function loadSeasonSpendByEstablishment(): Promise<
  Map<number, SeasonSpendEntry[]>
> {
  const rows = await prisma.stayClosingEntry.findMany({
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

  const map = new Map<number, SeasonSpendEntry[]>();
  for (const row of rows) {
    if (!row.establishment_id) continue;
    const list = map.get(row.establishment_id) ?? [];
    list.push({
      reference_date: resolveReferenceDate(
        row.stay_closing.trip.departure_date,
        row.stay_closing.closed_at.toISOString()
      ),
      approximate_total_bill: row.approximate_total_bill,
    });
    map.set(row.establishment_id, list);
  }
  return map;
}

function formatBillLabel(value: string): string {
  const amount = parsePaymentAmount(value);
  if (amount === null) return value.trim() || "—";
  return formatMoney(amount);
}

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

export async function getEstablishmentSeasonProgress(establishmentId: number) {
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: {
      seasonal_commission_enabled: true,
      seasonal_commission_start: true,
      seasonal_commission_end: true,
      seasonal_commission_target: true,
      seasonal_commission_after_target: true,
    },
  });
  if (!establishment) return null;

  const seasonal = normalizeSeasonalCommission(establishment);
  const spendByEst = await loadSeasonSpendByEstablishment();
  const spendEntries = spendByEst.get(establishmentId) ?? [];

  return buildEstablishmentSeasonProgress(seasonal, spendEntries);
}

export async function getClientBusinessStays(
  clientId: number
): Promise<ClientBusinessStay[]> {
  const rows = await prisma.trip.findMany({
    where: { client_id: clientId, follow_up_status: "completed" },
    include: {
      stay_closing: {
        include: { entries: { orderBy: { establishment_name: "asc" } } },
      },
      days: {
        orderBy: { date: "asc" },
        include: { activities: { orderBy: { sort_order: "asc" } } },
      },
    },
    orderBy: [{ departure_date: "desc" }, { arrival_date: "desc" }],
  });

  if (!rows.length) return [];

  const establishments = await listEstablishments({ limit: 500 });
  const lookup = buildEstablishmentLookup(establishments);
  const seasonSpendByEst = await loadSeasonSpendByEstablishment();

  return rows.map((row) => {
    const trip = buildTripWithDays(row);
    const closingEntries = row.stay_closing?.entries ?? [];
    const visited = collectVisitedEstablishmentsFromTrip(trip, lookup);

    const establishmentsList: ClientBusinessEstablishment[] = [];

    if (closingEntries.length > 0) {
      for (const entry of closingEntries) {
        const commission_amount =
          parsePaymentAmount(entry.calculated_commission) ?? 0;
        const establishment = entry.establishment_id
          ? lookup.get(`id-${entry.establishment_id}`)
          : undefined;
        const seasonal = establishment
          ? normalizeSeasonalCommission(establishment)
          : normalizeSeasonalCommission({ seasonal_commission_enabled: false });
        const season = getSeasonalDateRange(seasonal);
        const seasonSpend = entry.establishment_id
          ? seasonSpendByEst.get(entry.establishment_id) ?? []
          : [];
        const currentSpend =
          season && entry.establishment_id
            ? sumSeasonClientSpend(seasonSpend, season)
            : 0;
        const pendingSeason = isCommissionPendingSeasonTarget(
          seasonal,
          currentSpend
        );
        const visitedMeta = visited.find(
          (item) =>
            item.establishment_name.trim().toLowerCase() ===
            entry.establishment_name.trim().toLowerCase()
        );
        const fieldReqs = getStayClosingFieldRequirements(
          visitedMeta?.commission ??
            normalizeEstablishmentCommission({ commission_available: false })
        );
        const status: CommissionDisplayStatus = resolveCommissionDisplayStatus({
          commission_applied: entry.commission_applied,
          commission_amount,
          commission_received: entry.commission_received,
        });

        establishmentsList.push({
          entry_id: entry.id,
          establishment_name: entry.establishment_name,
          approximate_bill: formatBillLabel(entry.approximate_total_bill),
          premium_drinks_amount: formatBillLabel(entry.premium_drinks_amount),
          show_premium_drinks: fieldReqs.show_premium_drinks,
          commission_label:
            commission_amount > 0 ? formatMoney(commission_amount) : "—",
          commission_amount,
          status,
          status_label: commissionDisplayStatusLabel(status),
          pending_season_target: pendingSeason,
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
    } else {
      for (const item of visited) {
        establishmentsList.push({
          entry_id: null,
          establishment_name: item.establishment_name,
          approximate_bill: "—",
          premium_drinks_amount: "—",
          show_premium_drinks: item.field_requirements.show_premium_drinks,
          commission_label: "—",
          commission_amount: 0,
          status: "not_eligible",
          status_label: "Not eligible",
          pending_season_target: false,
          notes: "",
          commission_received: false,
          commission_payable: false,
        });
      }
    }

    let staySpend = 0;
    let expected = 0;
    let received = 0;
    let outstanding = 0;

    for (const est of establishmentsList) {
      const bill = parsePaymentAmount(est.approximate_bill);
      if (bill !== null) staySpend += bill;
      if (est.commission_amount <= 0) continue;
      expected += est.commission_amount;
      if (est.commission_received) received += est.commission_amount;
      else if (est.commission_payable) outstanding += est.commission_amount;
    }

    return {
      trip_id: row.id,
      destination: trip.destination || "Untitled",
      arrival_date: row.arrival_date,
      departure_date: row.departure_date,
      approximate_stay_spend: staySpend,
      approximate_stay_spend_label: staySpend > 0 ? formatMoney(staySpend) : "—",
      expected_commission: expected,
      expected_commission_label: expected > 0 ? formatMoney(expected) : "—",
      received_commission: received,
      received_commission_label: received > 0 ? formatMoney(received) : "—",
      outstanding_commission: outstanding,
      outstanding_commission_label:
        outstanding > 0 ? formatMoney(outstanding) : "—",
      establishments: establishmentsList,
      has_closing_data: closingEntries.length > 0,
    };
  });
}

export async function updateStayClosingEntryStatus(
  entryId: number,
  status: CommissionDisplayStatus
): Promise<boolean> {
  const entry = await prisma.stayClosingEntry.findUnique({
    where: { id: entryId },
    select: {
      commission_applied: true,
      calculated_commission: true,
      commission_pending_season_target: true,
    },
  });
  if (!entry) return false;

  const amount = parsePaymentAmount(entry.calculated_commission) ?? 0;
  if (status === "received") {
    if (!entry.commission_applied || amount <= 0) return false;
    await prisma.stayClosingEntry.update({
      where: { id: entryId },
      data: {
        commission_received: true,
        commission_received_at: new Date().toISOString().slice(0, 10),
      },
    });
    return true;
  }

  if (status === "pending") {
    await prisma.stayClosingEntry.update({
      where: { id: entryId },
      data: {
        commission_received: false,
        commission_received_at: "",
      },
    });
    return true;
  }

  return false;
}

export async function updateStayClosingEntryNotes(
  entryId: number,
  notes: string
): Promise<boolean> {
  try {
    await prisma.stayClosingEntry.update({
      where: { id: entryId },
      data: { internal_notes: notes.trim() },
    });
    return true;
  } catch {
    return false;
  }
}
