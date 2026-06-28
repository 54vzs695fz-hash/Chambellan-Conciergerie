import { parsePaymentAmount } from "@/lib/planner/payment-summary";
import type { BusinessDateRange } from "@/lib/dashboard/business-season";
import { isDateWithinRange, toIsoDate } from "@/lib/dashboard/business-season";
import {
  buildSeasonalCommissionProgress,
  getSeasonalDateRange,
  isCommissionPendingSeasonTarget,
  normalizeSeasonalCommission,
  sumSeasonClientSpend,
  type SeasonalCommissionFields,
  type SeasonalCommissionProgress,
} from "@/lib/establishments/seasonal-commission";

export type CommissionPayabilityStatus =
  | "payable"
  | "pending_season_target"
  | "received";

export interface BusinessCommissionRecord {
  entry_id: number;
  trip_id: number;
  client_id: number | null;
  client_name: string;
  destination: string;
  reference_date: string;
  departure_date: string;
  closed_at: string;
  establishment_id: number | null;
  establishment_name: string;
  partner_name: string;
  spend_amount: number;
  commission_amount: number;
  commission_applied: boolean;
  commission_received: boolean;
  commission_received_at: string;
  commission_pending_season_target: boolean;
  commission_status: CommissionPayabilityStatus;
  commission_payable: boolean;
}

export interface BusinessRankedItem {
  key: string;
  label: string;
  amount: number;
  count: number;
}

export interface BusinessDashboardMetrics {
  todays_expected: number;
  season_total: number;
  outstanding: number;
  received: number;
  pending_season_target: number;
}

export interface BusinessDashboardSummary {
  range: BusinessDateRange;
  metrics: BusinessDashboardMetrics;
  metrics_labels: {
    todays_expected: string;
    season_total: string;
    outstanding: string;
    received: string;
    pending_season_target: string;
  };
  top_clients: BusinessRankedItem[];
  top_establishments: BusinessRankedItem[];
  top_commission_partners: BusinessRankedItem[];
  top_destinations: BusinessRankedItem[];
  seasonal_partners: SeasonalCommissionProgress[];
  outstanding_entries: Array<{
    entry_id: number;
    client_name: string;
    establishment_name: string;
    destination: string;
    reference_date: string;
    commission_label: string;
    commission_amount: number;
    commission_status: CommissionPayabilityStatus;
    status_label: string;
  }>;
}

export function formatBusinessMoney(amount: number): string {
  return `€${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function resolveReferenceDate(
  departureDate: string,
  closedAt: string
): string {
  const departure = departureDate.trim();
  if (departure) return departure;
  if (!closedAt) return "";
  return closedAt.slice(0, 10);
}

export function resolveCommissionStatus(
  record: Pick<
    BusinessCommissionRecord,
    "commission_applied" | "commission_received" | "commission_pending_season_target"
  >
): CommissionPayabilityStatus {
  if (record.commission_received) return "received";
  if (record.commission_pending_season_target) return "pending_season_target";
  return "payable";
}

export function commissionStatusLabel(status: CommissionPayabilityStatus): string {
  switch (status) {
    case "received":
      return "Received";
    case "pending_season_target":
      return "Pending Season Target";
    default:
      return "Payable";
  }
}

export interface RawBusinessCommissionRow {
  entry_id: number;
  trip_id: number;
  client_id: number | null;
  client_name: string;
  destination: string;
  departure_date: string;
  closed_at: string;
  establishment_id: number | null;
  establishment_name: string;
  approximate_total_bill: string;
  calculated_commission: string;
  commission_applied: boolean;
  commission_received: boolean;
  commission_received_at: string;
  commission_pending_season_target: boolean;
  seasonal?: Partial<SeasonalCommissionFields>;
}

export function enrichRecordsWithSeasonalStatus(
  rows: RawBusinessCommissionRow[],
  spendRows: Array<{
    establishment_id: number | null;
    departure_date: string;
    closed_at: string;
    approximate_total_bill: string;
  }> = rows
): BusinessCommissionRecord[] {
  const spendByEstablishment = new Map<
    number,
    Array<{ reference_date: string; approximate_total_bill: string }>
  >();
  const seasonalByEstablishment = new Map<number, SeasonalCommissionFields>();

  for (const row of rows) {
    if (row.establishment_id && row.seasonal) {
      seasonalByEstablishment.set(
        row.establishment_id,
        normalizeSeasonalCommission(row.seasonal)
      );
    }
  }

  for (const row of spendRows) {
    if (!row.establishment_id) continue;
    const list = spendByEstablishment.get(row.establishment_id) ?? [];
    list.push({
      reference_date: resolveReferenceDate(row.departure_date, row.closed_at),
      approximate_total_bill: row.approximate_total_bill,
    });
    spendByEstablishment.set(row.establishment_id, list);
  }

  const seasonSpendCache = new Map<number, number>();
  for (const [establishmentId, seasonal] of seasonalByEstablishment) {
    const season = getSeasonalDateRange(seasonal);
    if (!season) continue;
    seasonSpendCache.set(
      establishmentId,
      sumSeasonClientSpend(spendByEstablishment.get(establishmentId) ?? [], season)
    );
  }

  return rows
    .map((row) => {
      const commission_amount =
        parsePaymentAmount(row.calculated_commission) ?? 0;
      const reference_date = resolveReferenceDate(
        row.departure_date,
        row.closed_at
      );
      const spend_amount = parsePaymentAmount(row.approximate_total_bill) ?? 0;

      let commission_pending_season_target = row.commission_pending_season_target;
      if (row.establishment_id && row.commission_applied && commission_amount > 0) {
        const seasonal = seasonalByEstablishment.get(row.establishment_id);
        if (seasonal) {
          const currentSpend = seasonSpendCache.get(row.establishment_id) ?? 0;
          commission_pending_season_target = isCommissionPendingSeasonTarget(
            seasonal,
            currentSpend
          );
        }
      }

      const commission_status = resolveCommissionStatus({
        commission_applied: row.commission_applied,
        commission_received: row.commission_received,
        commission_pending_season_target,
      });

      return {
        entry_id: row.entry_id,
        trip_id: row.trip_id,
        client_id: row.client_id,
        client_name: row.client_name.trim() || "Unlinked client",
        destination: row.destination.trim() || "Untitled",
        reference_date,
        departure_date: row.departure_date,
        closed_at: row.closed_at,
        establishment_id: row.establishment_id,
        establishment_name: row.establishment_name,
        partner_name: row.establishment_name,
        spend_amount,
        commission_amount,
        commission_applied: row.commission_applied,
        commission_received: row.commission_received,
        commission_received_at: row.commission_received_at,
        commission_pending_season_target,
        commission_status,
        commission_payable:
          row.commission_applied &&
          commission_amount > 0 &&
          commission_status === "payable",
      };
    })
    .filter((row) => row.commission_applied && row.commission_amount > 0);
}

export function filterRecordsByRange(
  records: BusinessCommissionRecord[],
  range: BusinessDateRange
): BusinessCommissionRecord[] {
  return records.filter((record) =>
    isDateWithinRange(record.reference_date, range)
  );
}

export function buildSeasonalPartnerSummaries(
  records: BusinessCommissionRecord[],
  seasonalEstablishments: Array<{
    establishment_id: number;
    establishment_name: string;
    seasonal: SeasonalCommissionFields;
  }>,
  spendRows: Array<{
    establishment_id: number | null;
    reference_date?: string;
    departure_date?: string;
    closed_at?: string;
    approximate_total_bill: string;
  }> = []
): SeasonalCommissionProgress[] {
  return seasonalEstablishments
    .map((partner) => {
      const partnerRecords = records.filter(
        (record) => record.establishment_id === partner.establishment_id
      );
      const partnerSpend = spendRows
        .filter((row) => row.establishment_id === partner.establishment_id)
        .map((row) => ({
          reference_date:
            row.reference_date ??
            resolveReferenceDate(row.departure_date ?? "", row.closed_at ?? ""),
          approximate_total_bill: row.approximate_total_bill,
        }));

      return buildSeasonalCommissionProgress({
        establishment_id: partner.establishment_id,
        establishment_name: partner.establishment_name,
        seasonal: partner.seasonal,
        spend_entries: partnerSpend,
        commission_entries: partnerRecords.map((record) => ({
          commission_amount: record.commission_amount,
          commission_applied: record.commission_applied,
          commission_received: record.commission_received,
          commission_pending_season_target:
            record.commission_pending_season_target,
          reference_date: record.reference_date,
        })),
      });
    })
    .filter((item): item is SeasonalCommissionProgress => item !== null)
    .sort((a, b) => b.season_target - a.season_target);
}

export function computeBusinessDashboardSummary(
  records: BusinessCommissionRecord[],
  range: BusinessDateRange,
  seasonalPartners: SeasonalCommissionProgress[] = [],
  today = new Date()
): BusinessDashboardSummary {
  const todayStr = toIsoDate(today);
  const inRange = filterRecordsByRange(records, range);

  const todays_expected = inRange
    .filter(
      (record) =>
        record.commission_payable &&
        (record.reference_date === todayStr ||
          record.closed_at.slice(0, 10) === todayStr)
    )
    .reduce((sum, record) => sum + record.commission_amount, 0);

  const season_total = inRange.reduce(
    (sum, record) => sum + record.commission_amount,
    0
  );

  const outstanding = inRange
    .filter((record) => record.commission_payable)
    .reduce((sum, record) => sum + record.commission_amount, 0);

  const received = inRange
    .filter((record) => record.commission_received)
    .reduce((sum, record) => sum + record.commission_amount, 0);

  const pending_season_target = inRange
    .filter((record) => record.commission_status === "pending_season_target")
    .reduce((sum, record) => sum + record.commission_amount, 0);

  const payableRecords = inRange.filter((record) => record.commission_payable);

  return {
    range,
    metrics: {
      todays_expected,
      season_total,
      outstanding,
      received,
      pending_season_target,
    },
    metrics_labels: {
      todays_expected: formatBusinessMoney(todays_expected),
      season_total: formatBusinessMoney(season_total),
      outstanding: formatBusinessMoney(outstanding),
      received: formatBusinessMoney(received),
      pending_season_target: formatBusinessMoney(pending_season_target),
    },
    top_clients: rankBy(payableRecords, (record) => ({
      key: record.client_id ? `client-${record.client_id}` : record.client_name,
      label: record.client_name,
    })),
    top_establishments: rankBy(payableRecords, (record) => ({
      key: record.establishment_id
        ? `est-${record.establishment_id}`
        : record.establishment_name.toLowerCase(),
      label: record.establishment_name,
    })),
    top_commission_partners: rankBy(payableRecords, (record) => ({
      key: record.establishment_id
        ? `partner-${record.establishment_id}`
        : record.partner_name.toLowerCase(),
      label: record.partner_name,
    })),
    top_destinations: rankBy(payableRecords, (record) => ({
      key: record.destination.toLowerCase(),
      label: record.destination,
    })),
    seasonal_partners: seasonalPartners,
    outstanding_entries: inRange
      .filter(
        (record) =>
          record.commission_payable ||
          record.commission_status === "pending_season_target"
      )
      .sort((a, b) => b.commission_amount - a.commission_amount)
      .slice(0, 8)
      .map((record) => ({
        entry_id: record.entry_id,
        client_name: record.client_name,
        establishment_name: record.establishment_name,
        destination: record.destination,
        reference_date: record.reference_date,
        commission_label: formatBusinessMoney(record.commission_amount),
        commission_amount: record.commission_amount,
        commission_status: record.commission_status,
        status_label: commissionStatusLabel(record.commission_status),
      })),
  };
}

function rankBy(
  records: BusinessCommissionRecord[],
  selector: (record: BusinessCommissionRecord) => { key: string; label: string },
  limit = 5
): BusinessRankedItem[] {
  const grouped = new Map<string, BusinessRankedItem>();

  for (const record of records) {
    const { key, label } = selector(record);
    const existing = grouped.get(key);
    if (existing) {
      existing.amount += record.commission_amount;
      existing.count += 1;
      continue;
    }
    grouped.set(key, {
      key,
      label,
      amount: record.commission_amount,
      count: 1,
    });
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.amount - a.amount || b.count - a.count)
    .slice(0, limit);
}

export function countOutstandingCommissions(
  records: BusinessCommissionRecord[]
): number {
  return records.filter((record) => record.commission_payable).length;
}

// Backward-compatible alias used by older imports/tests.
export function buildBusinessCommissionRecords(
  rows: Array<
    Omit<RawBusinessCommissionRow, "approximate_total_bill" | "seasonal"> & {
      approximate_total_bill?: string;
    }
  >
): BusinessCommissionRecord[] {
  return enrichRecordsWithSeasonalStatus(
    rows.map((row) => ({
      ...row,
      approximate_total_bill: row.approximate_total_bill ?? "",
      commission_pending_season_target: false,
    }))
  );
}
