import { mapClientRecord } from "./clients";
import {
  ensureChecklistSeeded,
  listChecklistItems,
  copyChecklistItems,
} from "./checklist";
import { prisma } from "@/lib/prisma";
import { parsePaymentAmount } from "@/lib/planner/payment-summary";
import {
  normalizeTripPaymentMethod,
  normalizeTripPaymentStatus,
} from "@/lib/planner/payment-status";
import type {
  Activity,
  ActivityPeriod,
  ActivityType,
  DaySection,
  Trip,
  TripDay,
  TripWithDays,
} from "../types";
import { EMPTY_TRIP_HEADER } from "../types";
import {
  parseDaySections,
  serializeDaySections,
} from "../planner/day-sections";
import {
  eachDayBetween,
  serializeDefaultDaySections,
} from "../planner/trip-days-sync";
import { isUntitledDestination } from "../planner-utils";
import { normalizeTripDestinations, parseDestinationsJson } from "../planner/trip-destinations";
import {
  buildEstablishmentCityLookup,
  syncTripDestinationsFromItinerary,
} from "../planner/itinerary-destinations";
import { syncBeachClubPersistedFields } from "../planner/beach-club";
import type {
  Activity as PrismaActivity,
  Trip as PrismaTrip,
  TripDay as PrismaTripDay,
} from "@/generated/prisma/client";

function mapTrip(row: PrismaTrip): Trip {
  const destinationFields = normalizeTripDestinations({
    multi_destination: row.multi_destination,
    destinations: parseDestinationsJson(row.destinations),
    destination: row.destination,
    destination_region: row.destination_region,
  });

  return {
    ...EMPTY_TRIP_HEADER,
    ...row,
    ...destinationFields,
    client_id: row.client_id,
    follow_up_status:
      (row.follow_up_status as Trip["follow_up_status"]) || "follow_up",
    payment_status: normalizeTripPaymentStatus(row.payment_status),
    total_amount: row.total_amount ?? "",
    amount_received: row.amount_received ?? "",
    payment_method: normalizeTripPaymentMethod(row.payment_method),
    payment_notes: row.payment_notes ?? "",
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function mapActivity(row: PrismaActivity): Activity {
  return {
    id: row.id,
    trip_day_id: row.trip_day_id,
    period: row.period,
    activity_type: row.activity_type as ActivityType,
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
  };
}

function mapDay(row: PrismaTripDay, activities: Activity[]): TripDay {
  return {
    id: row.id,
    trip_id: row.trip_id,
    date: row.date,
    sections: parseDaySections(row.sections),
    destination_override: row.destination_override ?? "",
    activities,
  };
}

async function loadEstablishmentCityLookup() {
  const [establishments, events, venues] = await Promise.all([
    prisma.establishment.findMany({
      select: { name: true, city: true, category: true },
    }),
    prisma.conciergeEvent.findMany({
      select: { name: true, destination: true },
    }),
    prisma.eventVenue.findMany({
      select: { name: true, destination: true },
    }),
  ]);

  return buildEstablishmentCityLookup([
    ...establishments.map((row) => ({
      name: row.name,
      city: row.city,
      category: row.category,
    })),
    ...events.map((row) => ({
      name: row.name,
      city: row.destination,
      category: "event",
    })),
    ...venues.map((row) => ({
      name: row.name,
      city: row.destination,
      category: "event",
    })),
  ]);
}

async function enrichTripDays(days: TripDay[]): Promise<TripDay[]> {
  const lookup = await loadEstablishmentCityLookup();
  return days.map((day) => ({
    ...day,
    activities: day.activities.map((activity) => {
      if (activity.establishment_city?.trim() || !activity.title?.trim()) {
        return activity;
      }
      const city = lookup(activity.title.trim(), activity.activity_type);
      return city ? { ...activity, establishment_city: city } : activity;
    }),
  }));
}

async function loadDays(tripId: number): Promise<TripDay[]> {
  const days = await prisma.tripDay.findMany({
    where: { trip_id: tripId },
    orderBy: { date: "asc" },
    include: {
      activities: { orderBy: [{ sort_order: "asc" }, { time: "asc" }] },
    },
  });
  return days.map((day) =>
    mapDay(day, day.activities.map(mapActivity))
  );
}

export async function getTrip(id: number): Promise<TripWithDays | undefined> {
  const row = await prisma.trip.findUnique({ where: { id } });
  if (!row) return undefined;
  const trip = mapTrip(row);
  const client = trip.client_id
    ? await prisma.client.findUnique({ where: { id: trip.client_id } })
    : null;
  await ensureChecklistSeeded(id);
  const checklist = await listChecklistItems(id);
  const days = await enrichTripDays(await loadDays(id));
  const lookup = await loadEstablishmentCityLookup();
  const destinationFields = syncTripDestinationsFromItinerary(
    { ...trip, days },
    lookup
  );

  return {
    ...trip,
    ...destinationFields,
    days,
    client: client ? mapClientRecord(client) : null,
    checklist,
  };
}

export async function listTrips(): Promise<Trip[]> {
  const rows = await prisma.trip.findMany({ orderBy: { updated_at: "desc" } });
  return rows.map(mapTrip);
}

export async function listConfirmedTripsWithDays(): Promise<TripWithDays[]> {
  const rows = await prisma.trip.findMany({
    where: { follow_up_status: "confirmed" },
    orderBy: [{ arrival_date: "asc" }, { updated_at: "desc" }],
    include: {
      client: true,
      days: {
        orderBy: { date: "asc" },
        include: {
          activities: {
            orderBy: [{ sort_order: "asc" }, { time: "asc" }],
          },
        },
      },
    },
  });

  return Promise.all(
    rows.map(async (row) => {
      const trip = mapTrip(row);
      const days = await enrichTripDays(
        row.days.map((day) => mapDay(day, day.activities.map(mapActivity)))
      );
      const lookup = await loadEstablishmentCityLookup();
      const destinationFields = syncTripDestinationsFromItinerary(
        { ...trip, days },
        lookup
      );
      return {
        ...trip,
        ...destinationFields,
        days,
        client: row.client ? mapClientRecord(row.client) : null,
        checklist: [],
      };
    })
  );
}

const tripDataFields = (
  payload: Omit<Trip, "id" | "created_at" | "updated_at">
) => {
  const destinationFields = normalizeTripDestinations(payload);

  return {
  client_id: payload.client_id,
  client_name: payload.client_name,
  destination: destinationFields.destination,
  multi_destination: destinationFields.multi_destination,
  destinations: destinationFields.destinations,
  destination_region: destinationFields.destination_region,
  arrival_date: payload.arrival_date,
  departure_date: payload.departure_date,
  hotel: payload.hotel,
  villa: payload.villa,
  driver: payload.driver,
  butler: payload.butler,
  security: payload.security,
  notes: payload.notes,
  driver_name: payload.driver_name,
  driver_phone: payload.driver_phone,
  butler_name: payload.butler_name,
  butler_phone: payload.butler_phone,
  security_contact: payload.security_contact,
  emergency_contact: payload.emergency_contact,
  yacht: payload.yacht,
  jet: payload.jet,
  restaurant_reservations: payload.restaurant_reservations,
  club_reservations: payload.club_reservations,
  event_booking: payload.event_booking,
  event_venue: payload.event_venue,
  host_name: payload.host_name,
  host_phone: payload.host_phone,
  host_contact: payload.host_contact,
  tailored_for: payload.tailored_for,
  follow_up_status: payload.follow_up_status,
  payment_status: payload.payment_status,
  total_amount: payload.total_amount,
  amount_received: payload.amount_received,
  payment_method: payload.payment_method,
  payment_notes: payload.payment_notes,
};
};

export async function createTrip(
  data: Partial<Omit<Trip, "id" | "created_at" | "updated_at">> = {}
): Promise<TripWithDays> {
  const payload = { ...EMPTY_TRIP_HEADER, ...data };
  const row = await prisma.trip.create({ data: tripDataFields(payload) });
  if (payload.arrival_date && payload.departure_date) {
    await syncTripDays(row.id, payload.arrival_date, payload.departure_date);
  }
  return (await getTrip(row.id))!;
}

export async function updateTrip(
  id: number,
  data: Omit<Trip, "id" | "created_at" | "updated_at">
): Promise<TripWithDays | undefined> {
  const existing = await getTrip(id);
  const payload = { ...EMPTY_TRIP_HEADER, ...data };

  try {
    const lookup = await loadEstablishmentCityLookup();
    const days = existing?.days ?? [];
    const destinationFields = syncTripDestinationsFromItinerary(
      { ...payload, days },
      lookup
    );

    await prisma.trip.update({
      where: { id },
      data: tripDataFields({ ...payload, ...destinationFields }),
    });
  } catch {
    return undefined;
  }

  if (payload.arrival_date && payload.departure_date) {
    await syncTripDays(
      id,
      payload.arrival_date,
      payload.departure_date,
      existing?.days
    );
  }
  return getTrip(id);
}

async function syncTripDays(
  tripId: number,
  arrival: string,
  departure: string,
  existingDays?: TripDay[]
) {
  const wanted = eachDayBetween(arrival, departure);
  const existingByDate = new Map(
    (existingDays ?? (await loadDays(tripId))).map((d) => [d.date, d])
  );
  const defaultSections = serializeDefaultDaySections();

  for (const date of wanted) {
    if (!existingByDate.has(date)) {
      await prisma.tripDay.upsert({
        where: { trip_id_date: { trip_id: tripId, date } },
        create: { trip_id: tripId, date, sections: defaultSections },
        update: {},
      });
    }
  }

  if (wanted.length) {
    await prisma.tripDay.deleteMany({
      where: { trip_id: tripId, date: { notIn: wanted } },
    });
  }
}

export async function updateDaySections(
  dayId: number,
  sections: DaySection[]
): Promise<TripDay | undefined> {
  return updateTripDay(dayId, { sections });
}

export async function updateTripDay(
  dayId: number,
  data: { sections?: DaySection[]; destination_override?: string }
): Promise<TripDay | undefined> {
  const updateData: {
    sections?: string;
    destination_override?: string;
  } = {};

  if (data.sections) {
    updateData.sections = serializeDaySections(data.sections);
  }
  if (data.destination_override !== undefined) {
    updateData.destination_override = data.destination_override;
  }

  if (Object.keys(updateData).length === 0) return undefined;

  try {
    const row = await prisma.tripDay.update({
      where: { id: dayId },
      data: updateData,
      include: {
        activities: { orderBy: [{ sort_order: "asc" }, { time: "asc" }] },
      },
    });
    return mapDay(row, row.activities.map(mapActivity));
  } catch {
    return undefined;
  }
}

export async function updateTripFollowUpStatus(
  id: number,
  follow_up_status: Trip["follow_up_status"]
): Promise<Trip | undefined> {
  try {
    const row = await prisma.trip.update({
      where: { id },
      data: { follow_up_status },
    });
    return mapTrip(row);
  } catch {
    return undefined;
  }
}

export async function updateTripPaymentStatus(
  id: number,
  payment_status: Trip["payment_status"]
): Promise<Trip | undefined> {
  return updateTripPaymentFields(id, { payment_status });
}

export async function updateTripPaymentFields(
  id: number,
  fields: Partial<
    Pick<
      Trip,
      | "payment_status"
      | "total_amount"
      | "amount_received"
      | "payment_method"
      | "payment_notes"
    >
  >
): Promise<Trip | undefined> {
  try {
    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) return undefined;

    const payment_status = fields.payment_status
      ? normalizeTripPaymentStatus(fields.payment_status)
      : normalizeTripPaymentStatus(existing.payment_status);
    const total_amount =
      fields.total_amount !== undefined
        ? fields.total_amount
        : (existing.total_amount ?? "");
    let amount_received =
      fields.amount_received !== undefined
        ? fields.amount_received
        : (existing.amount_received ?? "");

    if (payment_status === "fully_paid") {
      const total = parsePaymentAmount(total_amount);
      if (total !== null) {
        amount_received = String(total);
      }
    }

    const row = await prisma.trip.update({
      where: { id },
      data: {
        ...(fields.payment_status !== undefined ? { payment_status } : {}),
        ...(fields.total_amount !== undefined ? { total_amount } : {}),
        amount_received,
        ...(fields.payment_method !== undefined
          ? {
              payment_method: fields.payment_method
                ? normalizeTripPaymentMethod(fields.payment_method) ||
                  fields.payment_method
                : "",
            }
          : {}),
        ...(fields.payment_notes !== undefined
          ? { payment_notes: fields.payment_notes }
          : {}),
      },
    });
    return mapTrip(row);
  } catch {
    return undefined;
  }
}

export async function deleteTrip(id: number): Promise<boolean> {
  try {
    await prisma.trip.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export { isUntitledDestination } from "../planner-utils";

export async function deleteUntitledDestinationTrips(): Promise<number> {
  const result = await prisma.trip.deleteMany({
    where: {
      OR: [{ destination: "" }, { destination: "Untitled destination" }],
    },
  });
  return result.count;
}

export async function addActivity(
  tripDayId: number,
  period: ActivityPeriod,
  activity_type: ActivityType = "activity"
): Promise<Activity> {
  const maxOrder = await prisma.activity.aggregate({
    where: { trip_day_id: tripDayId, period },
    _max: { sort_order: true },
  });
  const sortOrder = (maxOrder._max.sort_order ?? -1) + 1;
  const row = await prisma.activity.create({
    data: {
      trip_day_id: tripDayId,
      period,
      activity_type,
      sort_order: sortOrder,
    },
  });
  return mapActivity(row);
}

export async function updateActivity(
  id: number,
  fields: Partial<
    Pick<
      Activity,
      | "period"
      | "activity_type"
      | "time"
      | "title"
      | "details"
      | "status"
      | "booking_status"
      | "assigned_to"
      | "booking_notes"
      | "sort_order"
      | "establishment_city"
      | "beach_sunbeds"
      | "beach_sunbeds_time"
      | "beach_lunch"
      | "beach_lunch_time"
      | "beach_sunbeds_status"
      | "beach_lunch_status"
    >
  >
): Promise<Activity | undefined> {
  try {
    const syncedFields = syncBeachClubPersistedFields(fields);
    const row = await prisma.activity.update({
      where: { id },
      data: syncedFields,
    });
    const activity = mapActivity(row);

    if (
      fields.establishment_city !== undefined ||
      fields.title !== undefined ||
      fields.beach_sunbeds !== undefined ||
      fields.beach_lunch !== undefined
    ) {
      const day = await prisma.tripDay.findUnique({
        where: { id: row.trip_day_id },
        select: { trip_id: true },
      });
      if (day) {
        const trip = await getTrip(day.trip_id);
        if (trip) {
          const lookup = await loadEstablishmentCityLookup();
          const destinationFields = syncTripDestinationsFromItinerary(trip, lookup);
          await prisma.trip.update({
            where: { id: day.trip_id },
            data: tripDataFields({ ...trip, ...destinationFields }),
          });
        }
      }
    }

    return activity;
  } catch {
    return undefined;
  }
}

export async function deleteActivity(id: number): Promise<boolean> {
  try {
    await prisma.activity.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function duplicateTrip(tripId: number): Promise<TripWithDays | undefined> {
  const source = await getTrip(tripId);
  if (!source) return undefined;
  const {
    days: _d,
    client: _c,
    id: _i,
    created_at: _ca,
    updated_at: _ua,
    ...tripData
  } = source;
  const copy = await createTrip(tripData);

  for (const day of source.days) {
    const newDay = copy.days.find((d) => d.date === day.date);
    if (!newDay) continue;
    if (day.sections.length) {
      await prisma.tripDay.update({
        where: { id: newDay.id },
        data: {
          sections: serializeDaySections(day.sections),
          destination_override: day.destination_override ?? "",
        },
      });
    }
    for (const act of day.activities) {
      await prisma.activity.create({
        data: {
          trip_day_id: newDay.id,
          period: act.period,
          activity_type: act.activity_type,
          time: act.time,
          title: act.title,
          details: act.details,
          status: act.status,
          sort_order: act.sort_order,
          establishment_city: act.establishment_city ?? "",
          beach_sunbeds: act.beach_sunbeds ?? false,
          beach_sunbeds_time: act.beach_sunbeds_time ?? "",
          beach_lunch: act.beach_lunch ?? false,
          beach_lunch_time: act.beach_lunch_time ?? "",
          beach_sunbeds_status: act.beach_sunbeds_status ?? "to_request",
          beach_lunch_status: act.beach_lunch_status ?? "to_request",
        },
      });
    }
  }

  await prisma.tripChecklistItem.deleteMany({ where: { trip_id: copy.id } });
  await copyChecklistItems(tripId, copy.id);

  return getTrip(copy.id);
}
