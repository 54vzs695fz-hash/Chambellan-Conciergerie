import { getClient } from "./clients";
import { isPostgres } from "./config";
import { ensureDb, getSqliteDb } from "./index";
import { getPostgres, pgRows, rowTimestamps } from "./postgres";
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

const TRIP_INSERT_COLUMNS = `
  client_id, client_name, destination, arrival_date, departure_date,
  hotel, villa, driver, butler, security, notes,
  driver_name, driver_phone, butler_name, butler_phone,
  security_contact, emergency_contact,
  yacht, jet, restaurant_reservations, club_reservations
`;

function normalizeTrip(row: Record<string, unknown>): Trip {
  return { ...EMPTY_TRIP_HEADER, ...rowTimestamps(row) } as Trip;
}

async function loadActivitiesForDaySqlite(dayId: number): Promise<Activity[]> {
  const db = getSqliteDb();
  return db
    .prepare(
      `SELECT * FROM activities WHERE trip_day_id = ?
       ORDER BY sort_order ASC, time ASC`
    )
    .all(dayId) as Activity[];
}

async function loadActivitiesForDayPostgres(dayId: number): Promise<Activity[]> {
  const sql = getPostgres();
  return pgRows<Activity>(
    await sql`
    SELECT * FROM activities WHERE trip_day_id = ${dayId}
    ORDER BY sort_order ASC, time ASC
  `
  );
}

async function loadActivitiesForDay(dayId: number): Promise<Activity[]> {
  return isPostgres()
    ? loadActivitiesForDayPostgres(dayId)
    : loadActivitiesForDaySqlite(dayId);
}

async function mapDayRow(row: Record<string, unknown>): Promise<TripDay> {
  return {
    id: row.id as number,
    trip_id: row.trip_id as number,
    date: row.date as string,
    sections: parseDaySections(row.sections),
    activities: await loadActivitiesForDay(row.id as number),
  };
}

async function loadDays(tripId: number): Promise<TripDay[]> {
  if (isPostgres()) {
    const sql = getPostgres();
    const days = pgRows<Record<string, unknown>>(
      await sql`
      SELECT * FROM trip_days WHERE trip_id = ${tripId} ORDER BY date ASC
    `
    );
    return Promise.all(days.map((day) => mapDayRow(day as Record<string, unknown>)));
  }

  const db = getSqliteDb();
  const days = db
    .prepare("SELECT * FROM trip_days WHERE trip_id = ? ORDER BY date ASC")
    .all(tripId) as Record<string, unknown>[];
  return Promise.all(days.map(mapDayRow));
}

export async function getTrip(id: number): Promise<TripWithDays | undefined> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<Record<string, unknown>>(
      await sql`SELECT * FROM trips WHERE id = ${id}`
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const trip = normalizeTrip(row);
    const client = trip.client_id ? await getClient(trip.client_id) : null;
    return { ...trip, days: await loadDays(id), client: client ?? null };
  }

  const db = getSqliteDb();
  const row = db.prepare("SELECT * FROM trips WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return undefined;
  const trip = normalizeTrip(row);
  const client = trip.client_id ? await getClient(trip.client_id) : null;
  return { ...trip, days: await loadDays(id), client: client ?? null };
}

export async function listTrips(): Promise<Trip[]> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<Record<string, unknown>>(
      await sql`SELECT * FROM trips ORDER BY updated_at DESC`
    );
    return rows.map((row) => normalizeTrip(row as Record<string, unknown>));
  }

  const db = getSqliteDb();
  return db
    .prepare("SELECT * FROM trips ORDER BY updated_at DESC")
    .all() as Trip[];
}

function tripPayloadValues(payload: Omit<Trip, "id" | "created_at" | "updated_at">) {
  return [
    payload.client_id,
    payload.client_name,
    payload.destination,
    payload.arrival_date,
    payload.departure_date,
    payload.hotel,
    payload.villa,
    payload.driver,
    payload.butler,
    payload.security,
    payload.notes,
    payload.driver_name,
    payload.driver_phone,
    payload.butler_name,
    payload.butler_phone,
    payload.security_contact,
    payload.emergency_contact,
    payload.yacht,
    payload.jet,
    payload.restaurant_reservations,
    payload.club_reservations,
  ] as const;
}

export async function createTrip(
  data: Partial<Omit<Trip, "id" | "created_at" | "updated_at">> = {}
): Promise<TripWithDays> {
  await ensureDb();
  const payload = { ...EMPTY_TRIP_HEADER, ...data };

  if (isPostgres()) {
    const sql = getPostgres();
    const values = tripPayloadValues(payload);
    const rows = pgRows<{ id: number }>(
      await sql`
      INSERT INTO trips (
        client_id, client_name, destination, arrival_date, departure_date,
        hotel, villa, driver, butler, security, notes,
        driver_name, driver_phone, butler_name, butler_phone,
        security_contact, emergency_contact,
        yacht, jet, restaurant_reservations, club_reservations
      ) VALUES (
        ${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, ${values[4]},
        ${values[5]}, ${values[6]}, ${values[7]}, ${values[8]}, ${values[9]},
        ${values[10]}, ${values[11]}, ${values[12]}, ${values[13]}, ${values[14]},
        ${values[15]}, ${values[16]}, ${values[17]}, ${values[18]}, ${values[19]},
        ${values[20]}
      )
      RETURNING id
    `
    );
    const id = Number(rows[0].id);
    if (payload.arrival_date && payload.departure_date) {
      await syncTripDays(id, payload.arrival_date, payload.departure_date);
    }
    return (await getTrip(id))!;
  }

  const db = getSqliteDb();
  const result = db
    .prepare(
      `INSERT INTO trips (${TRIP_INSERT_COLUMNS}) VALUES (
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
    await syncTripDays(id, payload.arrival_date, payload.departure_date);
  }
  return (await getTrip(id))!;
}

export async function updateTrip(
  id: number,
  data: Omit<Trip, "id" | "created_at" | "updated_at">
): Promise<TripWithDays | undefined> {
  await ensureDb();
  const existing = await getTrip(id);
  const payload = { ...EMPTY_TRIP_HEADER, ...data };

  if (isPostgres()) {
    const sql = getPostgres();
    const values = tripPayloadValues(payload);
    await sql`
      UPDATE trips SET
        client_id = ${values[0]}, client_name = ${values[1]},
        destination = ${values[2]}, arrival_date = ${values[3]},
        departure_date = ${values[4]}, hotel = ${values[5]}, villa = ${values[6]},
        driver = ${values[7]}, butler = ${values[8]}, security = ${values[9]},
        notes = ${values[10]}, driver_name = ${values[11]}, driver_phone = ${values[12]},
        butler_name = ${values[13]}, butler_phone = ${values[14]},
        security_contact = ${values[15]}, emergency_contact = ${values[16]},
        yacht = ${values[17]}, jet = ${values[18]},
        restaurant_reservations = ${values[19]}, club_reservations = ${values[20]},
        updated_at = NOW()
      WHERE id = ${id}
    `;
  } else {
    const db = getSqliteDb();
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

  if (isPostgres()) {
    const sql = getPostgres();
    const defaultSections = serializeDefaultDaySections();
    for (const date of wanted) {
      if (!existingByDate.has(date)) {
        await sql`
          INSERT INTO trip_days (trip_id, date, sections)
          VALUES (${tripId}, ${date}, ${defaultSections})
          ON CONFLICT (trip_id, date) DO NOTHING
        `;
      }
    }
    if (wanted.length) {
      const existingDayRows = pgRows<{ id: number; date: string }>(
        await sql`SELECT id, date FROM trip_days WHERE trip_id = ${tripId}`
      );
      for (const day of existingDayRows) {
        if (!wanted.includes(day.date)) {
          await sql`DELETE FROM trip_days WHERE id = ${day.id}`;
        }
      }
    }
    return;
  }

  const db = getSqliteDb();
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

export async function updateDaySections(
  dayId: number,
  sections: DaySection[]
): Promise<TripDay | undefined> {
  await ensureDb();
  const serialized = serializeDaySections(sections);

  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<Record<string, unknown>>(
      await sql`
      UPDATE trip_days SET sections = ${serialized}
      WHERE id = ${dayId}
      RETURNING *
    `
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return mapDayRow({ ...row, sections: serialized });
  }

  const db = getSqliteDb();
  const current = db
    .prepare("SELECT * FROM trip_days WHERE id = ?")
    .get(dayId) as Record<string, unknown> | undefined;
  if (!current) return undefined;
  db.prepare("UPDATE trip_days SET sections = ? WHERE id = ?").run(
    serialized,
    dayId
  );
  return mapDayRow({ ...current, sections: serialized });
}

export async function deleteTrip(id: number): Promise<boolean> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<{ id: number }>(
      await sql`DELETE FROM trips WHERE id = ${id} RETURNING id`
    );
    return rows.length > 0;
  }

  const db = getSqliteDb();
  const result = db.prepare("DELETE FROM trips WHERE id = ?").run(id);
  return result.changes > 0;
}

export async function addActivity(
  tripDayId: number,
  period: ActivityPeriod,
  activity_type: ActivityType = "activity"
): Promise<Activity> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const maxRows = pgRows<{ n: number }>(
      await sql`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS n
      FROM activities WHERE trip_day_id = ${tripDayId} AND period = ${period}
    `
    );
    const sortOrder = Number(maxRows[0]?.n ?? 0);
    const rows = pgRows<Activity>(
      await sql`
      INSERT INTO activities (trip_day_id, period, activity_type, sort_order)
      VALUES (${tripDayId}, ${period}, ${activity_type}, ${sortOrder})
      RETURNING *
    `
    );
    return rows[0];
  }

  const db = getSqliteDb();
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
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const currentRows = pgRows<Activity>(
      await sql`SELECT * FROM activities WHERE id = ${id}`
    );
    const current = currentRows[0];
    if (!current) return undefined;
    const merged = { ...current, ...fields };
    const rows = pgRows<Activity>(
      await sql`
      UPDATE activities SET
        period = ${merged.period},
        activity_type = ${merged.activity_type},
        time = ${merged.time},
        title = ${merged.title},
        details = ${merged.details},
        status = ${merged.status},
        sort_order = ${merged.sort_order}
      WHERE id = ${id}
      RETURNING *
    `
    );
    return rows[0];
  }

  const db = getSqliteDb();
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

export async function deleteActivity(id: number): Promise<boolean> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<{ id: number }>(
      await sql`DELETE FROM activities WHERE id = ${id} RETURNING id`
    );
    return rows.length > 0;
  }

  const db = getSqliteDb();
  const result = db.prepare("DELETE FROM activities WHERE id = ?").run(id);
  return result.changes > 0;
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

  if (isPostgres()) {
    const sql = getPostgres();
    for (const day of source.days) {
      const newDay = copy.days.find((d) => d.date === day.date);
      if (!newDay) continue;
      if (day.sections.length) {
        await sql`
          UPDATE trip_days SET sections = ${serializeDaySections(day.sections)}
          WHERE id = ${newDay.id}
        `;
      }
      for (const act of day.activities) {
        await sql`
          INSERT INTO activities (
            trip_day_id, period, activity_type, time, title, details, status, sort_order
          ) VALUES (
            ${newDay.id}, ${act.period}, ${act.activity_type}, ${act.time},
            ${act.title}, ${act.details}, ${act.status}, ${act.sort_order}
          )
        `;
      }
    }
    return getTrip(copy.id);
  }

  const db = getSqliteDb();
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
