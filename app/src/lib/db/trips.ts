import { getClient } from "./clients";
import { prisma } from "@/lib/prisma";
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
import type {
  Activity as PrismaActivity,
  Trip as PrismaTrip,
  TripDay as PrismaTripDay,
} from "@/generated/prisma/client";

function mapTrip(row: PrismaTrip): Trip {
  return {
    ...EMPTY_TRIP_HEADER,
    ...row,
    client_id: row.client_id,
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
    sort_order: row.sort_order,
  };
}

function mapDay(row: PrismaTripDay, activities: Activity[]): TripDay {
  return {
    id: row.id,
    trip_id: row.trip_id,
    date: row.date,
    sections: parseDaySections(row.sections),
    activities,
  };
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
  const client = trip.client_id ? await getClient(trip.client_id) : null;
  return { ...trip, days: await loadDays(id), client: client ?? null };
}

export async function listTrips(): Promise<Trip[]> {
  const rows = await prisma.trip.findMany({ orderBy: { updated_at: "desc" } });
  return rows.map(mapTrip);
}

const tripDataFields = (
  payload: Omit<Trip, "id" | "created_at" | "updated_at">
) => ({
  client_id: payload.client_id,
  client_name: payload.client_name,
  destination: payload.destination,
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
});

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
    await prisma.trip.update({
      where: { id },
      data: tripDataFields(payload),
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
  const serialized = serializeDaySections(sections);
  try {
    const row = await prisma.tripDay.update({
      where: { id: dayId },
      data: { sections: serialized },
      include: {
        activities: { orderBy: [{ sort_order: "asc" }, { time: "asc" }] },
      },
    });
    return mapDay(row, row.activities.map(mapActivity));
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
      | "sort_order"
    >
  >
): Promise<Activity | undefined> {
  try {
    const row = await prisma.activity.update({
      where: { id },
      data: fields,
    });
    return mapActivity(row);
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
        data: { sections: serializeDaySections(day.sections) },
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
        },
      });
    }
  }
  return getTrip(copy.id);
}
