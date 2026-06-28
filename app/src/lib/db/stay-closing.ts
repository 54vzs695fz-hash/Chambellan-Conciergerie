import type {
  StayClosing as PrismaStayClosing,
  StayClosingEntry as PrismaStayClosingEntry,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateStayClosingCommission } from "@/lib/stay-closing/calculate-commission";
import {
  buildEstablishmentLookup,
  collectVisitedEstablishmentsFromTrip,
  type VisitedEstablishment,
} from "@/lib/stay-closing/visited-establishments";
import { listEstablishments } from "@/lib/db/establishments";
import { applySeasonalCommissionPendingFlags } from "@/lib/stay-closing/seasonal-status";
import { getTrip } from "@/lib/db/trips";
import type {
  StayClosing,
  StayClosingEntry,
  StayClosingEntryInput,
} from "@/lib/types";

function parseActivityIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function mapEntry(row: PrismaStayClosingEntry): StayClosingEntry {
  return {
    id: row.id,
    stay_closing_id: row.stay_closing_id,
    establishment_id: row.establishment_id,
    establishment_name: row.establishment_name,
    activity_ids: parseActivityIds(row.activity_ids),
    approximate_total_bill: row.approximate_total_bill,
    food_amount: row.food_amount,
    premium_drinks_amount: row.premium_drinks_amount,
    internal_notes: row.internal_notes,
    calculated_commission: row.calculated_commission,
    commission_applied: row.commission_applied,
    commission_received: row.commission_received,
    commission_received_at: row.commission_received_at,
    commission_pending_season_target: row.commission_pending_season_target,
    commission_summary: row.commission_summary,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function mapStayClosing(
  row: PrismaStayClosing & { entries: PrismaStayClosingEntry[] }
): StayClosing {
  return {
    id: row.id,
    trip_id: row.trip_id,
    closed_at: row.closed_at.toISOString(),
    vip_notes: row.vip_notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    entries: row.entries.map(mapEntry),
  };
}

export interface StayClosingPreview {
  visited: VisitedEstablishment[];
  closing: StayClosing | null;
}

export async function getStayClosingPreview(
  tripId: number
): Promise<StayClosingPreview | null> {
  const trip = await getTrip(tripId);
  if (!trip) return null;

  const establishments = await listEstablishments({ limit: 500 });
  const lookup = buildEstablishmentLookup(establishments);
  const visited = collectVisitedEstablishmentsFromTrip(trip, lookup);

  const closingRow = await prisma.stayClosing.findUnique({
    where: { trip_id: tripId },
    include: { entries: { orderBy: { establishment_name: "asc" } } },
  });

  return {
    visited,
    closing: closingRow ? mapStayClosing(closingRow) : null,
  };
}

function mergeEntryWithVisited(
  visited: VisitedEstablishment[],
  closing: StayClosing | null
): Array<VisitedEstablishment & { saved?: StayClosingEntry }> {
  const savedByKey = new Map<string, StayClosingEntry>();
  const savedByName = new Map<string, StayClosingEntry>();

  for (const entry of closing?.entries ?? []) {
    const idKey =
      entry.establishment_id !== null
        ? `est-${entry.establishment_id}`
        : `name-${entry.establishment_name.trim().toLowerCase()}`;
    savedByKey.set(idKey, entry);
    savedByName.set(entry.establishment_name.trim().toLowerCase(), entry);
  }

  return visited.map((row) => {
    const saved =
      savedByKey.get(row.key) ??
      savedByName.get(row.establishment_name.trim().toLowerCase());
    return saved ? { ...row, saved } : row;
  });
}

export async function saveStayClosing(
  tripId: number,
  entries: StayClosingEntryInput[]
): Promise<StayClosing | null> {
  const preview = await getStayClosingPreview(tripId);
  if (!preview) return null;

  const visitedByKey = new Map(preview.visited.map((row) => [row.key, row]));
  const existingReceived = new Map<string, { received: boolean; receivedAt: string }>();
  for (const entry of preview.closing?.entries ?? []) {
    const key = entry.establishment_name.trim().toLowerCase();
    existingReceived.set(key, {
      received: entry.commission_received,
      receivedAt: entry.commission_received_at,
    });
  }

  const trip = await getTrip(tripId);
  if (!trip) return null;

  const draftEntries = entries
    .filter((entry) => visitedByKey.has(entry.key))
    .map((entry) => {
      const visited = visitedByKey.get(entry.key)!;
      const amounts = {
        approximate_total_bill: entry.approximate_total_bill.trim(),
        food_amount: entry.food_amount.trim(),
        premium_drinks_amount: entry.premium_drinks_amount.trim(),
      };
      const commissionResult = calculateStayClosingCommission(
        visited.commission,
        amounts
      );
      const prior = existingReceived.get(
        visited.establishment_name.trim().toLowerCase()
      );

      return {
        establishment_id: visited.establishment_id,
        establishment_name: visited.establishment_name,
        activity_ids: visited.activity_ids,
        approximate_total_bill: amounts.approximate_total_bill,
        food_amount: amounts.food_amount,
        premium_drinks_amount: amounts.premium_drinks_amount,
        internal_notes: entry.internal_notes.trim(),
        calculated_commission: commissionResult.amountLabel,
        commission_applied: commissionResult.applied,
        commission_received: prior?.received ?? false,
        commission_received_at: prior?.receivedAt ?? "",
        commission_summary: commissionResult.summary,
        departure_date: trip.departure_date,
      };
    });

  const closedAtIso = new Date().toISOString();
  const pendingFlags = await applySeasonalCommissionPendingFlags(
    draftEntries.map((entry) => ({
      establishment_id: entry.establishment_id,
      establishment_name: entry.establishment_name,
      approximate_total_bill: entry.approximate_total_bill,
      commission_applied: entry.commission_applied,
      departure_date: entry.departure_date,
      closed_at: closedAtIso,
    })),
    trip.departure_date,
    closedAtIso,
    preview.closing?.id
  );

  const payloadEntries = draftEntries.map((entry, index) => ({
    establishment_id: entry.establishment_id,
    establishment_name: entry.establishment_name,
    activity_ids: entry.activity_ids,
    approximate_total_bill: entry.approximate_total_bill,
    food_amount: entry.food_amount,
    premium_drinks_amount: entry.premium_drinks_amount,
    internal_notes: entry.internal_notes,
    calculated_commission: entry.calculated_commission,
    commission_applied: entry.commission_applied,
    commission_received: entry.commission_received,
    commission_received_at: entry.commission_received_at,
    commission_pending_season_target: pendingFlags[index] ?? false,
    commission_summary: entry.commission_summary,
  }));

  const closing = await prisma.$transaction(async (tx) => {
    const existing = await tx.stayClosing.findUnique({
      where: { trip_id: tripId },
    });

    const closingRow = existing
      ? await tx.stayClosing.update({
          where: { id: existing.id },
          data: { closed_at: new Date() },
        })
      : await tx.stayClosing.create({
          data: { trip_id: tripId },
        });

    await tx.stayClosingEntry.deleteMany({
      where: { stay_closing_id: closingRow.id },
    });

    if (payloadEntries.length) {
      await tx.stayClosingEntry.createMany({
        data: payloadEntries.map((entry) => ({
          stay_closing_id: closingRow.id,
          ...entry,
          activity_ids: entry.activity_ids,
        })),
      });
    }

    return tx.stayClosing.findUniqueOrThrow({
      where: { id: closingRow.id },
      include: { entries: { orderBy: { establishment_name: "asc" } } },
    });
  });

  return mapStayClosing(closing);
}

export { mergeEntryWithVisited };

export async function getTripStayClosingStatus(
  tripId: number
): Promise<{ isClosed: boolean; closedAt: string | null; entryCount: number }> {
  const closing = await prisma.stayClosing.findUnique({
    where: { trip_id: tripId },
    include: { entries: true },
  });

  if (!closing) {
    return { isClosed: false, closedAt: null, entryCount: 0 };
  }

  return {
    isClosed: true,
    closedAt: closing.closed_at.toISOString(),
    entryCount: closing.entries.length,
  };
}

export function buildStayClosingFormRows(
  preview: StayClosingPreview
): Array<VisitedEstablishment & { saved?: StayClosingEntry }> {
  return mergeEntryWithVisited(preview.visited, preview.closing);
}
