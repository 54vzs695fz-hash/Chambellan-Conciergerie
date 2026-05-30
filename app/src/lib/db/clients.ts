import { getDb } from "./index";
import type { Client } from "../types";

export function listClients(search?: string): Client[] {
  const db = getDb();
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

export function getClient(id: number): Client | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as
    | Client
    | undefined;
}

export function createClient(
  data: Omit<Client, "id" | "created_at" | "updated_at">
): Client {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO clients (full_name, phone, whatsapp, email, nationality, notes, preferences)
       VALUES (@full_name, @phone, @whatsapp, @email, @nationality, @notes, @preferences)`
    )
    .run(data);
  return getClient(Number(result.lastInsertRowid))!;
}

export function updateClient(
  id: number,
  data: Omit<Client, "id" | "created_at" | "updated_at">
): Client | undefined {
  const db = getDb();
  db.prepare(
    `UPDATE clients SET
      full_name = @full_name, phone = @phone, whatsapp = @whatsapp,
      email = @email, nationality = @nationality, notes = @notes,
      preferences = @preferences, updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...data, id });
  return getClient(id);
}

export function deleteClient(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return result.changes > 0;
}

export interface ClientTripSummary {
  id: number;
  destination: string;
  arrival_date: string;
  departure_date: string;
  created_at: string;
  notes: string;
}

export function getClientTripHistory(clientId: number): ClientTripSummary[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, destination, arrival_date, departure_date, created_at, notes
       FROM trips WHERE client_id = ?
       ORDER BY arrival_date DESC`
    )
    .all(clientId) as ClientTripSummary[];
}

export function getClientDestinations(clientId: number): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT destination FROM trips
       WHERE client_id = ? AND destination != ''
       ORDER BY destination ASC`
    )
    .all(clientId) as { destination: string }[];
  return rows.map((r) => r.destination);
}
