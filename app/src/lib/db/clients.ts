import { isPostgres } from "./config";
import { ensureDb, getSqliteDb } from "./index";
import { getPostgres, pgRows, rowTimestamps } from "./postgres";
import type { Client } from "../types";

export interface ClientTripSummary {
  id: number;
  destination: string;
  arrival_date: string;
  departure_date: string;
  created_at: string;
  notes: string;
}

export async function listClients(search?: string): Promise<Client[]> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      const rows = pgRows<Record<string, unknown>>(
        await sql`
        SELECT * FROM clients
        WHERE full_name ILIKE ${q} OR email ILIKE ${q} OR phone ILIKE ${q}
        ORDER BY full_name ASC
      `
      );
      return rows.map((row) => rowTimestamps(row) as unknown as Client);
    }
    const rows = pgRows<Record<string, unknown>>(
      await sql`SELECT * FROM clients ORDER BY full_name ASC`
    );
    return rows.map((row) => rowTimestamps(row) as unknown as Client);
  }

  const db = getSqliteDb();
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    return db
      .prepare(
        `SELECT * FROM clients
         WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ?
         ORDER BY full_name ASC`
      )
      .all(q, q, q) as Client[];
  }
  return db
    .prepare("SELECT * FROM clients ORDER BY full_name ASC")
    .all() as Client[];
}

export async function getClient(id: number): Promise<Client | undefined> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<Record<string, unknown>>(
      await sql`SELECT * FROM clients WHERE id = ${id}`
    );
    const row = rows[0];
    return row ? (rowTimestamps(row) as unknown as Client) : undefined;
  }

  const db = getSqliteDb();
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as
    | Client
    | undefined;
}

export async function createClient(
  data: Omit<Client, "id" | "created_at" | "updated_at">
): Promise<Client> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<Record<string, unknown>>(
      await sql`
      INSERT INTO clients (
        full_name, phone, whatsapp, email, nationality, notes, preferences
      ) VALUES (
        ${data.full_name}, ${data.phone}, ${data.whatsapp}, ${data.email},
        ${data.nationality}, ${data.notes}, ${data.preferences}
      )
      RETURNING *
    `
    );
    return rowTimestamps(rows[0]) as unknown as Client;
  }

  const db = getSqliteDb();
  const result = db
    .prepare(
      `INSERT INTO clients (full_name, phone, whatsapp, email, nationality, notes, preferences)
       VALUES (@full_name, @phone, @whatsapp, @email, @nationality, @notes, @preferences)`
    )
    .run(data);
  return (await getClient(Number(result.lastInsertRowid)))!;
}

export async function updateClient(
  id: number,
  data: Omit<Client, "id" | "created_at" | "updated_at">
): Promise<Client | undefined> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<Record<string, unknown>>(
      await sql`
      UPDATE clients SET
        full_name = ${data.full_name},
        phone = ${data.phone},
        whatsapp = ${data.whatsapp},
        email = ${data.email},
        nationality = ${data.nationality},
        notes = ${data.notes},
        preferences = ${data.preferences},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    );
    const row = rows[0];
    return row ? (rowTimestamps(row) as unknown as Client) : undefined;
  }

  const db = getSqliteDb();
  db.prepare(
    `UPDATE clients SET
      full_name = @full_name, phone = @phone, whatsapp = @whatsapp,
      email = @email, nationality = @nationality, notes = @notes,
      preferences = @preferences, updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...data, id });
  return await getClient(id);
}

export async function deleteClient(id: number): Promise<boolean> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<{ id: number }>(
      await sql`DELETE FROM clients WHERE id = ${id} RETURNING id`
    );
    return rows.length > 0;
  }

  const db = getSqliteDb();
  const result = db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return result.changes > 0;
}

export async function getClientTripHistory(
  clientId: number
): Promise<ClientTripSummary[]> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<Record<string, unknown>>(
      await sql`
      SELECT id, destination, arrival_date, departure_date, created_at, notes
      FROM trips WHERE client_id = ${clientId}
      ORDER BY arrival_date DESC
    `
    );
    return rows.map((row) => rowTimestamps(row) as unknown as ClientTripSummary);
  }

  const db = getSqliteDb();
  return db
    .prepare(
      `SELECT id, destination, arrival_date, departure_date, created_at, notes
       FROM trips WHERE client_id = ?
       ORDER BY arrival_date DESC`
    )
    .all(clientId) as ClientTripSummary[];
}

export async function getClientDestinations(clientId: number): Promise<string[]> {
  await ensureDb();
  if (isPostgres()) {
    const sql = getPostgres();
    const rows = pgRows<{ destination: string }>(
      await sql`
      SELECT DISTINCT destination FROM trips
      WHERE client_id = ${clientId} AND destination != ''
      ORDER BY destination ASC
    `
    );
    return rows.map((row) => String(row.destination));
  }

  const db = getSqliteDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT destination FROM trips
       WHERE client_id = ? AND destination != ''
       ORDER BY destination ASC`
    )
    .all(clientId) as { destination: string }[];
  return rows.map((r) => r.destination);
}
