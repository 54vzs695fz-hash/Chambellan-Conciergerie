import type {
  Activity as PrismaActivity,
  StayClosingEntry as PrismaStayClosingEntry,
  Trip as PrismaTrip,
  TripDay as PrismaTripDay,
} from "@/generated/prisma/client";
import { listEstablishments } from "@/lib/db/establishments";
import { prisma } from "@/lib/prisma";
import { normalizeTripDestinations, parseDestinationsJson } from "@/lib/planner/trip-destinations";
import {
  buildStayHistoryEstablishments,
  formatStayHistoryMoney,
  sumStayClosingCommission,
  sumStayClosingSpend,
} from "@/lib/stay-closing/stay-history-summary";
import {
  buildEstablishmentLookup,
  collectVisitedEstablishmentsFromTrip,
} from "@/lib/stay-closing/visited-establishments";
import type {
  Activity,
  ActivityType,
  ClientStayHistoryItem,
  DaySection,
  StayClosingEntry,
  TripDay,
  TripWithDays,
} from "@/lib/types";
import { parseDaySections } from "@/lib/planner/day-sections";
import { normalizeActivityType } from "@/lib/planner/transportation";

function mapActivity(row: PrismaActivity): Activity {
  return {
    id: row.id,
    trip_day_id: row.trip_day_id,
    period: row.period,
    activity_type: normalizeActivityType(row.activity_type) as ActivityType,
    time: row.time,
    title: row.title,
    details: row.details,
    status: row.status as Activity["status"],
    booking_status: (row.booking_status ?? "to_request") as Activity["booking_status"],
    assigned_to: row.assigned_to ?? "",
    booking_notes: row.booking_notes ?? "",
    sort_order: row.sort_order,
    establishment_city: row.establishment_city ?? "",
    beach_sunbeds: row.beach_sunbeds ?? false,
    beach_sunbeds_time: row.beach_sunbeds_time ?? "",
    beach_lunch: row.beach_lunch ?? false,
    beach_lunch_time: row.beach_lunch_time ?? "",
    beach_sunbeds_status: (row.beach_sunbeds_status ??
      "to_request") as Activity["beach_sunbeds_status"],
    beach_lunch_status: (row.beach_lunch_status ??
      "to_request") as Activity["beach_lunch_status"],
    transport_type: row.transport_type ?? "",
    transport_pickup: row.transport_pickup ?? "",
    transport_destination: row.transport_destination ?? "",
  };
}

function mapDay(row: PrismaTripDay, activities: Activity[]): TripDay {
  return {
    id: row.id,
    trip_id: row.trip_id,
    date: row.date,
    sections: parseDaySections(row.sections) as DaySection[],
    destination_override: row.destination_override ?? "",
    activities,
  };
}

function mapClosingEntry(row: PrismaStayClosingEntry): StayClosingEntry {
  return {
    id: row.id,
    stay_closing_id: row.stay_closing_id,
    establishment_id: row.establishment_id,
    establishment_name: row.establishment_name,
    activity_ids: Array.isArray(row.activity_ids)
      ? row.activity_ids
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      : [],
    approximate_total_bill: row.approximate_total_bill,
    food_amount: row.food_amount,
    premium_drinks_amount: row.premium_drinks_amount,
    internal_notes: row.internal_notes,
    calculated_commission: row.calculated_commission,
    commission_applied: row.commission_applied,
    commission_summary: row.commission_summary,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function buildTripWithDays(
  row: PrismaTrip & {
    days: (PrismaTripDay & { activities: PrismaActivity[] })[];
  }
): TripWithDays {
  const destinationFields = normalizeTripDestinations({
    multi_destination: row.multi_destination,
    destinations: parseDestinationsJson(row.destinations),
    destination: row.destination,
    destination_region: row.destination_region,
  });

  const days = row.days.map((day) =>
    mapDay(
      day,
      day.activities.map(mapActivity).sort((a, b) => a.sort_order - b.sort_order)
    )
  );

  return {
    id: row.id,
    client_id: row.client_id,
    client_name: row.client_name,
    ...destinationFields,
    arrival_date: row.arrival_date,
    departure_date: row.departure_date,
    hotel: row.hotel,
    villa: row.villa,
    driver: row.driver,
    butler: row.butler,
    security: row.security,
    notes: row.notes,
    driver_name: row.driver_name,
    driver_phone: row.driver_phone,
    butler_name: row.butler_name,
    butler_phone: row.butler_phone,
    security_contact: row.security_contact,
    emergency_contact: row.emergency_contact,
    yacht: row.yacht,
    jet: row.jet,
    restaurant_reservations: row.restaurant_reservations,
    club_reservations: row.club_reservations,
    event_booking: row.event_booking,
    event_venue: row.event_venue,
    host_name: row.host_name,
    host_phone: row.host_phone,
    host_contact: row.host_contact,
    tailored_for: row.tailored_for,
    follow_up_status: row.follow_up_status as TripWithDays["follow_up_status"],
    payment_status: row.payment_status as TripWithDays["payment_status"],
    total_amount: row.total_amount ?? "",
    amount_received: row.amount_received ?? "",
    payment_method: row.payment_method as TripWithDays["payment_method"],
    payment_notes: row.payment_notes ?? "",
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    days,
    checklist: [],
  };
}

export async function getClientStayHistory(
  clientId: number
): Promise<ClientStayHistoryItem[]> {
  const rows = await prisma.trip.findMany({
    where: { client_id: clientId, follow_up_status: "completed" },
    include: {
      stay_closing: {
        include: {
          entries: { orderBy: { establishment_name: "asc" } },
        },
      },
      days: {
        orderBy: { date: "asc" },
        include: {
          activities: { orderBy: { sort_order: "asc" } },
        },
      },
    },
    orderBy: [{ departure_date: "desc" }, { arrival_date: "desc" }],
  });

  if (!rows.length) return [];

  const establishments = await listEstablishments({ limit: 500 });
  const lookup = buildEstablishmentLookup(establishments);

  return rows.map((row) => {
    const trip = buildTripWithDays(row);
    const closingEntries = row.stay_closing?.entries.map(mapClosingEntry) ?? [];
    const visitedFromItinerary = collectVisitedEstablishmentsFromTrip(trip, lookup);
    const visitedNames =
      closingEntries.length > 0
        ? closingEntries.map((entry) => entry.establishment_name)
        : visitedFromItinerary.map((item) => item.establishment_name);

    const spend = sumStayClosingSpend(closingEntries);
    const commission = sumStayClosingCommission(closingEntries);

    return {
      trip_id: row.id,
      stay_closing_id: row.stay_closing?.id ?? null,
      destination: trip.destination || "Untitled",
      destination_region: trip.destination_region,
      arrival_date: row.arrival_date,
      departure_date: row.departure_date,
      closed_at: row.stay_closing?.closed_at.toISOString() ?? null,
      visited_establishments: visitedNames,
      establishments: closingEntries.length
        ? buildStayHistoryEstablishments(closingEntries)
        : visitedNames.map((name) => ({
            name,
            approximate_total_bill: "—",
            commission: "—",
            commission_applied: false,
          })),
      approximate_stay_spend: spend,
      approximate_stay_spend_label: formatStayHistoryMoney(spend),
      commission_generated: commission,
      commission_generated_label: formatStayHistoryMoney(commission),
      vip_notes: row.stay_closing?.vip_notes ?? "",
      has_closing_data: closingEntries.length > 0,
    };
  });
}

export async function updateStayClosingVipNotes(
  tripId: number,
  vipNotes: string
): Promise<{ trip_id: number; vip_notes: string } | null> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return null;

  const closing = await prisma.$transaction(async (tx) => {
    const existing = await tx.stayClosing.findUnique({
      where: { trip_id: tripId },
    });

    if (existing) {
      return tx.stayClosing.update({
        where: { id: existing.id },
        data: { vip_notes: vipNotes.trim() },
      });
    }

    return tx.stayClosing.create({
      data: {
        trip_id: tripId,
        vip_notes: vipNotes.trim(),
      },
    });
  });

  return {
    trip_id: tripId,
    vip_notes: closing.vip_notes,
  };
}
