import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClientMobileHub } from "@/components/crm/ClientMobileHub";
import { ClientProfileTabs } from "@/components/crm/ClientProfileTabs";
import { ClientDeleteButton } from "@/components/crm/ClientDeleteButton";
import { ClientForm } from "@/components/crm/ClientForm";
import { ClientRelationshipsSection } from "@/components/crm/ClientRelationshipsSection";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import { getClientBusinessStays } from "@/lib/db/client-business";
import { listClientRelationships } from "@/lib/db/client-relationships";
import { getClientStayHistory } from "@/lib/db/client-stay-history";
import {
  getClient,
  getClientDestinations,
  getClientLinkedTripCount,
  getClientTripHistory,
  listClients,
} from "@/lib/db/clients";
import { createTrip } from "@/lib/db/trips";
import { formatDateRange } from "@/lib/planner-utils";
import type { TripFollowUpStatus } from "@/lib/types";

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
  const stayHistory = await getClientStayHistory(clientId);
  const businessStays = await getClientBusinessStays(clientId);
  const activeTrips = trips.filter((trip) => trip.follow_up_status !== "completed");
  const destinations = await getClientDestinations(clientId);
  const linkedPlannerCount = await getClientLinkedTripCount(clientId);
  const relationships = await listClientRelationships(clientId);
  const allClients = await listClients();

  return (
    <div className="page-shell max-w-4xl">
      <div className="md:hidden">
        <ClientMobileHub
          client={client}
          stayHistory={stayHistory}
          businessStays={businessStays}
          activeTrips={activeTrips}
          relationships={relationships}
          allClients={allClients.map(({ id, full_name }) => ({ id, full_name }))}
          createPlannerForm={
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
              <button type="submit" className="client-mobile-sheet-primary">
                New planner
              </button>
            </form>
          }
        />
      </div>

      <div className="hidden md:block">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">{client.full_name}</h1>
          <p className="text-sm text-muted mt-1">Client profile & stay history</p>
        </div>
        <div className="flex flex-wrap gap-3">
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
            <button type="submit" className="btn-primary min-h-[44px]">
              New planner
            </button>
          </form>
          <ClientDeleteButton
            clientId={client.id}
            clientName={client.full_name}
            linkedPlannerCount={linkedPlannerCount}
          />
        </div>
      </div>

      <ClientProfileTabs
        stayHistory={stayHistory}
        businessStays={businessStays}
        profileContent={
          <div className="grid lg:grid-cols-2 gap-10 mb-12">
            <div className="space-y-10">
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

              <ClientRelationshipsSection
                clientId={client.id}
                initialRelationships={relationships}
                allClients={allClients.map(({ id, full_name }) => ({ id, full_name }))}
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
                <h2 className="section-title mb-4">Active planners</h2>
                {activeTrips.length === 0 ? (
                  <p className="text-sm text-muted">No active planners linked.</p>
                ) : (
                  <ul className="space-y-2">
                    {activeTrips.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/planner/${t.id}`}
                          className="card block px-4 py-3 hover:border-gold/40 text-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-serif text-gold">
                              {t.destination || "Untitled"}
                            </span>
                            <ProgrammeStatusBadge
                              status={
                                (t.follow_up_status as TripFollowUpStatus) || "follow_up"
                              }
                              showDot
                              arrivalDate={t.arrival_date}
                            />
                          </div>
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
        }
      />
      </div>
    </div>
  );
}
