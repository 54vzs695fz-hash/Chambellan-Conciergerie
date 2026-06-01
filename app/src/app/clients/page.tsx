"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import { toIsoDate, startOfDay } from "@/lib/calendar/programmes";
import type { Client, Trip, TripFollowUpStatus } from "@/lib/types";

function nextUpcomingTripForClient(
  client: Client,
  trips: Trip[]
): Trip | null {
  const today = toIsoDate(startOfDay(new Date()));
  const matches = trips.filter(
    (t) =>
      t.client_id === client.id ||
      (t.client_name &&
        client.full_name &&
        t.client_name.trim().toLowerCase() ===
          client.full_name.trim().toLowerCase())
  );
  const upcoming = matches
    .filter((t) => t.arrival_date && t.departure_date >= today)
    .sort((a, b) => a.arrival_date.localeCompare(b.arrival_date));
  return upcoming[0] ?? matches.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const url = q ? `/api/clients?q=${encodeURIComponent(q)}` : "/api/clients";
    fetch(url)
      .then((r) => r.json())
      .then(setClients);
  }, [q]);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTrips(data);
      })
      .catch(() => setTrips([]));
  }, []);

  const tripByClient = useMemo(() => {
    const map = new Map<number, { status: TripFollowUpStatus; arrival: string }>();
    for (const client of clients) {
      const trip = nextUpcomingTripForClient(client, trips);
      if (trip) {
        map.set(client.id, {
          status: trip.follow_up_status ?? "follow_up",
          arrival: trip.arrival_date,
        });
      }
    }
    return map;
  }, [clients, trips]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">Clients</h1>
          <p className="text-sm text-muted mt-1">CRM · Private profiles</p>
        </div>
        <Link href="/clients/new" className="btn-primary min-h-[44px]">
          New client
        </Link>
      </div>

      <input
        className="field-input max-w-sm mb-6"
        placeholder="Search name, email, phone…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {clients.length === 0 ? (
        <p className="text-sm text-muted">No clients found.</p>
      ) : (
        <ul className="space-y-2 max-w-2xl">
          {clients.map((c) => {
            const programme = tripByClient.get(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="card block px-5 py-4 hover:border-gold/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{c.full_name}</p>
                      <p className="text-xs text-muted mt-1">
                        {[c.email, c.phone, c.nationality]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {programme ? (
                        <div className="client-list-status">
                          <ProgrammeStatusBadge
                            status={programme.status}
                            showDot
                            arrivalDate={programme.arrival}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
