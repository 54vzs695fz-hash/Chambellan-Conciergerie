import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClientForm } from "@/components/crm/ClientForm";
import {
  getClient,
  getClientDestinations,
  getClientTripHistory,
} from "@/lib/db/clients";
import { createTrip } from "@/lib/db/trips";
import { formatDateRange } from "@/lib/planner-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESERVED_CLIENT_SLUGS = new Set(["new"]);

async function createPlannerForClient(clientId: number, clientName: string) {
  "use server";
  const trip = await createTrip({
    client_id: clientId,
    client_name: clientName,
    destination: "",
    arrival_date: "",
    departure_date: "",
    hotel: "",
    villa: "",
    driver: "",
    butler: "",
    security: "",
    notes: "",
  });
  return trip.id;
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (RESERVED_CLIENT_SLUGS.has(id)) {
    redirect("/clients/new");
  }

  const clientId = Number(id);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    notFound();
  }

  const client = await getClient(clientId);
  if (!client) notFound();

  const trips = await getClientTripHistory(clientId);
  const destinations = await getClientDestinations(clientId);

  return (
    <div className="page-shell max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">{client.full_name}</h1>
          <p className="text-sm text-muted mt-1">Client profile & trip history</p>
        </div>
        <form
          action={async () => {
            "use server";
            const tripId = await createPlannerForClient(
              client.id,
              client.full_name
            );
            const { redirect } = await import("next/navigation");
            redirect(`/planner/${tripId}`);
          }}
        >
          <button type="submit" className="btn-primary">
            New planner
          </button>
        </form>
      </div>

      <div className="grid lg:grid-cols-2 gap-10 mb-12">
        <div>
          <h2 className="section-title mb-4">Profile</h2>
          <ClientForm
            initial={{
              full_name: client.full_name,
              phone: client.phone,
              whatsapp: client.whatsapp,
              email: client.email,
              nationality: client.nationality,
              notes: client.notes,
              preferences: client.preferences,
            }}
            clientId={client.id}
          />
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="section-title mb-4">Previous destinations</h2>
            {destinations.length === 0 ? (
              <p className="text-sm text-muted">No destinations recorded yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {destinations.map((d) => (
                  <li
                    key={d}
                    className="px-3 py-1.5 bg-beige text-sm font-serif text-gold tracking-wide rounded-sm"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="section-title mb-4">Trip history</h2>
            {trips.length === 0 ? (
              <p className="text-sm text-muted">No planners linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {trips.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/planner/${t.id}`}
                      className="card block px-4 py-3 hover:border-gold/40 text-sm"
                    >
                      <span className="font-serif text-gold">
                        {t.destination || "Untitled"}
                      </span>
                      <p className="text-xs text-muted mt-1">
                        {formatDateRange(t.arrival_date, t.departure_date)}
                      </p>
                      {t.notes ? (
                        <p className="text-xs text-muted mt-1 italic line-clamp-2">
                          {t.notes}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
