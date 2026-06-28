import { parsePaymentAmount } from "@/lib/planner/payment-summary";
import type { BusinessDateRange } from "@/lib/dashboard/business-season";
import { isDateWithinRange, toIsoDate } from "@/lib/dashboard/business-season";

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
  commission_amount: number;
  commission_applied: boolean;
  commission_received: boolean;
  commission_received_at: string;
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
}

export interface BusinessDashboardSummary {
  range: BusinessDateRange;
  metrics: BusinessDashboardMetrics;
  metrics_labels: {
    todays_expected: string;
    season_total: string;
    outstanding: string;
    received: string;
  };
  top_clients: BusinessRankedItem[];
  top_establishments: BusinessRankedItem[];
  top_commission_partners: BusinessRankedItem[];
  top_destinations: BusinessRankedItem[];
  outstanding_entries: Array<{
    entry_id: number;
    client_name: string;
    establishment_name: string;
    destination: string;
    reference_date: string;
    commission_label: string;
    commission_amount: number;
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

export function buildBusinessCommissionRecords(
  rows: Array<{
    entry_id: number;
    trip_id: number;
    client_id: number | null;
    client_name: string;
    destination: string;
    departure_date: string;
    closed_at: string;
    establishment_id: number | null;
    establishment_name: string;
    calculated_commission: string;
    commission_applied: boolean;
    commission_received: boolean;
    commission_received_at: string;
  }>
): BusinessCommissionRecord[] {
  return rows
    .map((row) => {
      const commission_amount =
        parsePaymentAmount(row.calculated_commission) ?? 0;
      const reference_date = resolveReferenceDate(
        row.departure_date,
        row.closed_at
      );

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
        commission_amount,
        commission_applied: row.commission_applied,
        commission_received: row.commission_received,
        commission_received_at: row.commission_received_at,
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

export function computeBusinessDashboardSummary(
  records: BusinessCommissionRecord[],
  range: BusinessDateRange,
  today = new Date()
): BusinessDashboardSummary {
  const todayStr = toIsoDate(today);
  const inRange = filterRecordsByRange(records, range);

  const todays_expected = inRange
    .filter(
      (record) =>
        !record.commission_received &&
        (record.reference_date === todayStr ||
          record.closed_at.slice(0, 10) === todayStr)
    )
    .reduce((sum, record) => sum + record.commission_amount, 0);

  const season_total = inRange.reduce(
    (sum, record) => sum + record.commission_amount,
    0
  );

  const outstanding = inRange
    .filter((record) => !record.commission_received)
    .reduce((sum, record) => sum + record.commission_amount, 0);

  const received = inRange
    .filter((record) => record.commission_received)
    .reduce((sum, record) => sum + record.commission_amount, 0);

  return {
    range,
    metrics: {
      todays_expected,
      season_total,
      outstanding,
      received,
    },
    metrics_labels: {
      todays_expected: formatBusinessMoney(todays_expected),
      season_total: formatBusinessMoney(season_total),
      outstanding: formatBusinessMoney(outstanding),
      received: formatBusinessMoney(received),
    },
    top_clients: rankBy(inRange, (record) => ({
      key: record.client_id ? `client-${record.client_id}` : record.client_name,
      label: record.client_name,
    })),
    top_establishments: rankBy(inRange, (record) => ({
      key: record.establishment_id
        ? `est-${record.establishment_id}`
        : record.establishment_name.toLowerCase(),
      label: record.establishment_name,
    })),
    top_commission_partners: rankBy(inRange, (record) => ({
      key: record.establishment_id
        ? `partner-${record.establishment_id}`
        : record.partner_name.toLowerCase(),
      label: record.partner_name,
    })),
    top_destinations: rankBy(inRange, (record) => ({
      key: record.destination.toLowerCase(),
      label: record.destination,
    })),
    outstanding_entries: inRange
      .filter((record) => !record.commission_received)
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
  return records.filter((record) => !record.commission_received).length;
}
