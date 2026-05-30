import { getDb } from "./index";
import { getClient } from "./clients";
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

function loadActivitiesForDay(dayId: number): Activity[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM activities WHERE trip_day_id = ?
       ORDER BY sort_order ASC, time ASC`
    )
    .all(dayId) as Activity[];
}

function mapDayRow(row: Record<string, unknown>): TripDay {
  return {
    id: row.id as number,
    trip_id: row.trip_id as number,
    date: row.date as string,
    sections: parseDaySections(row.sections),
    activities: loadActivitiesForDay(row.id as number),
  };
}

function loadDays(tripId: number): TripDay[] {
  const db = getDb();
  const days = db
    .prepare("SELECT * FROM trip_days WHERE trip_id = ? ORDER BY date ASC")
    .all(tripId) as Record<string, unknown>[];
  return days.map(mapDayRow);
}

function normalizeTrip(row: Record<string, unknown>): Trip {
  return { ...EMPTY_TRIP_HEADER, ...row } as Trip;
}

export function getTrip(id: number): TripWithDays | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM trips WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return undefined;
  const trip = normalizeTrip(row);
  const client = trip.client_id ? getClient(trip.client_id) : null;
  return { ...trip, days: loadDays(id), client: client ?? null };
}

export function listTrips(): Trip[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM trips ORDER BY updated_at DESC")
    .all() as Trip[];
}

export function createTrip(
  data: Partial<Omit<Trip, "id" | "created_at" | "updated_at">> = {}
): TripWithDays {
  const payload = { ...EMPTY_TRIP_HEADER, ...data };
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO trips (
        client_id, client_name, destination, arrival_date, departure_date,
        hotel, villa, driver, butler, security, notes,
        driver_name, driver_phone, butler_name, butler_phone,
        security_contact, emergency_contact,
        yacht, jet, restaurant_reservations, club_reservations
      ) VALUES (
        @client_id, @client_name, @destination, @arrival_date, @departure_date,
        @hotel, @villa, @driver, @butler, @security, @notes,
        @driver_name, @driver_phone, @butler_name, @butler_phone,
        @security_contact, @emergency_contact,
        @yacht, @jet, @restaurant_reservations, @club_reservations
      )`
    )
    .run(payload);
  const id = Number(result.lastInsertRowid);
  if (payload.arrival_date && payload.departure_date) {
    syncTripDays(id, payload.arrival_date, payload.departure_date);
  }
  return getTrip(id)!;
}

export function updateTrip(
  id: number,
  data: Omit<Trip, "id" | "created_at" | "updated_at">
): TripWithDays | undefined {
  const db = getDb();
  const existing = getTrip(id);
  const payload = { ...EMPTY_TRIP_HEADER, ...data };
  db.prepare(
    `UPDATE trips SET
      client_id = @client_id, client_name = @client_name,
      destination = @destination, arrival_date = @arrival_date,
      departure_date = @departure_date,
      hotel = @hotel, villa = @villa, driver = @driver, butler = @butler,
      security = @security, notes = @notes,
      driver_name = @driver_name, driver_phone = @driver_phone,
      butler_name = @butler_name, butler_phone = @butler_phone,
      security_contact = @security_contact, emergency_contact = @emergency_contact,
      yacht = @yacht, jet = @jet,
      restaurant_reservations = @restaurant_reservations,
      club_reservations = @club_reservations,
      updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...payload, id });

  if (payload.arrival_date && payload.departure_date) {
    syncTripDays(
      id,
      payload.arrival_date,
      payload.departure_date,
      existing?.days
    );
  }
  return getTrip(id);
}

function syncTripDays(
  tripId: number,
  arrival: string,
  departure: string,
  existingDays?: TripDay[]
) {
  const db = getDb();
  const wanted = eachDayBetween(arrival, departure);
  const existingByDate = new Map(
    (existingDays ?? loadDays(tripId)).map((d) => [d.date, d])
  );

  for (const date of wanted) {
    if (!existingByDate.has(date)) {
      db.prepare(
        "INSERT INTO trip_days (trip_id, date, sections) VALUES (?, ?, ?)"
      ).run(tripId, date, serializeDefaultDaySections());
    }
  }

  if (wanted.length) {
    const placeholders = wanted.map(() => "?").join(",");
    db.prepare(
      `DELETE FROM trip_days WHERE trip_id = ? AND date NOT IN (${placeholders})`
    ).run(tripId, ...wanted);
  }
}

export function updateDaySections(
  dayId: number,
  sections: DaySection[]
): TripDay | undefined {
  const db = getDb();
  const current = db
    .prepare("SELECT * FROM trip_days WHERE id = ?")
    .get(dayId) as Record<string, unknown> | undefined;
  if (!current) return undefined;
  db.prepare("UPDATE trip_days SET sections = ? WHERE id = ?").run(
    serializeDaySections(sections),
    dayId
  );
  return mapDayRow({ ...current, sections: serializeDaySections(sections) });
}

export function deleteTrip(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM trips WHERE id = ?").run(id);
  return result.changes > 0;
}

export function addActivity(
  tripDayId: number,
  period: ActivityPeriod,
  activity_type: ActivityType = "activity"
): Activity {
  const db = getDb();
  const maxOrder = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM activities WHERE trip_day_id = ? AND period = ?"
    )
    .get(tripDayId, period) as { n: number };
  const result = db
    .prepare(
      `INSERT INTO activities (trip_day_id, period, activity_type, sort_order)
       VALUES (?, ?, ?, ?)`
    )
    .run(tripDayId, period, activity_type, maxOrder.n);
  return db
    .prepare("SELECT * FROM activities WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as Activity;
}

export function updateActivity(
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
): Activity | undefined {
  const db = getDb();
  const current = db
    .prepare("SELECT * FROM activities WHERE id = ?")
    .get(id) as Activity | undefined;
  if (!current) return undefined;
  const merged = { ...current, ...fields };
  db.prepare(
    `UPDATE activities SET
      period = @period, activity_type = @activity_type, time = @time,
      title = @title, details = @details, status = @status, sort_order = @sort_order
     WHERE id = @id`
  ).run({ ...merged, id });
  return db.prepare("SELECT * FROM activities WHERE id = ?").get(id) as Activity;
}

export function deleteActivity(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM activities WHERE id = ?").run(id);
  return result.changes > 0;
}

export function duplicateTrip(tripId: number): TripWithDays | undefined {
  const source = getTrip(tripId);
  if (!source) return undefined;
  const {
    days: _d,
    client: _c,
    id: _i,
    created_at: _ca,
    updated_at: _ua,
    ...tripData
  } = source;
  const copy = createTrip(tripData);
  const db = getDb();
  for (const day of source.days) {
    const newDay = copy.days.find((d) => d.date === day.date);
    if (!newDay) continue;
    if (day.sections.length) {
      db.prepare("UPDATE trip_days SET sections = ? WHERE id = ?").run(
        serializeDaySections(day.sections),
        newDay.id
      );
    }
    for (const act of day.activities) {
      db.prepare(
        `INSERT INTO activities (trip_day_id, period, activity_type, time, title, details, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        newDay.id,
        act.period,
        act.activity_type,
        act.time,
        act.title,
        act.details,
        act.status,
        act.sort_order
      );
    }
  }
  return getTrip(copy.id);
}
