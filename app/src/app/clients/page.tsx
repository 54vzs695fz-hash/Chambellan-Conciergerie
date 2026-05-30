"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const url = q ? `/api/clients?q=${encodeURIComponent(q)}` : "/api/clients";
    fetch(url)
      .then((r) => r.json())
      .then(setClients);
  }, [q]);

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">Clients</h1>
          <p className="text-sm text-muted mt-1">CRM · Private profiles</p>
        </div>
        <Link href="/clients/new" className="btn-primary">
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
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="card block px-5 py-4 hover:border-gold/40"
              >
                <p className="font-medium">{c.full_name}</p>
                <p className="text-xs text-muted mt-1">
                  {[c.email, c.phone, c.nationality].filter(Boolean).join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
