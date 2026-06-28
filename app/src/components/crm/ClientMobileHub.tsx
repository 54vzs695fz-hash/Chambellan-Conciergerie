"use client";

import Link from "next/link";
import { useState } from "react";
import { ClientBottomSheet } from "@/components/crm/ClientBottomSheet";
import { ClientBusinessTab } from "@/components/crm/ClientBusinessTab";
import { ClientRelationshipsSection } from "@/components/crm/ClientRelationshipsSection";
import { ClientStayHistorySection } from "@/components/crm/ClientStayHistorySection";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import { buildClientWhatsAppUrl } from "@/lib/crm/whatsapp";
import { formatDateRange } from "@/lib/planner-utils";
import type { ClientTripSummary } from "@/lib/db/clients";
import type {
  Client,
  ClientBusinessStay,
  ClientRelationshipWithClient,
  ClientStayHistoryItem,
  TripFollowUpStatus,
} from "@/lib/types";

type SheetId =
  | "whatsapp"
  | "planner"
  | "history"
  | "business"
  | "vip"
  | "relationship";

interface Props {
  client: Client;
  stayHistory: ClientStayHistoryItem[];
  businessStays: ClientBusinessStay[];
  activeTrips: ClientTripSummary[];
  relationships: ClientRelationshipWithClient[];
  allClients: Pick<Client, "id" | "full_name">[];
  createPlannerForm: React.ReactNode;
}

const ACTIONS: { id: SheetId; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "planner", label: "Planner" },
  { id: "history", label: "History" },
  { id: "business", label: "Business" },
  { id: "vip", label: "VIP Notes" },
  { id: "relationship", label: "Relationship" },
];

export function ClientMobileHub({
  client,
  stayHistory,
  businessStays,
  activeTrips,
  relationships,
  allClients,
  createPlannerForm,
}: Props) {
  const [sheet, setSheet] = useState<SheetId | null>(null);

  const whatsappNumber = client.whatsapp.trim() || client.phone.trim();
  const whatsappUrl = buildClientWhatsAppUrl(whatsappNumber);

  return (
    <div className="client-mobile-hub">
      <header className="client-mobile-head">
        <h1 className="client-mobile-name">{client.full_name}</h1>
      </header>

      <div className="client-mobile-actions" role="toolbar" aria-label="Client actions">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="client-mobile-action"
            onClick={() => setSheet(action.id)}
          >
            {action.label}
          </button>
        ))}
      </div>

      <ClientBottomSheet
        open={sheet === "whatsapp"}
        title="WhatsApp"
        onClose={() => setSheet(null)}
      >
        {whatsappUrl ? (
          <div className="client-mobile-sheet-stack">
            <p className="client-mobile-sheet-lead">{whatsappNumber}</p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="client-mobile-sheet-primary"
            >
              Open WhatsApp
            </a>
          </div>
        ) : (
          <p className="client-mobile-sheet-empty">
            No WhatsApp or phone number on file.
          </p>
        )}
      </ClientBottomSheet>

      <ClientBottomSheet
        open={sheet === "planner"}
        title="Planner"
        onClose={() => setSheet(null)}
      >
        <div className="client-mobile-sheet-stack">
          {createPlannerForm}
          {activeTrips.length === 0 ? (
            <p className="client-mobile-sheet-empty">No active planners linked.</p>
          ) : (
            <ul className="client-mobile-planner-list">
              {activeTrips.map((trip) => (
                <li key={trip.id}>
                  <Link
                    href={`/planner/${trip.id}`}
                    className="client-mobile-planner-link"
                    onClick={() => setSheet(null)}
                  >
                    <span className="client-mobile-planner-destination">
                      {trip.destination || "Untitled"}
                    </span>
                    <ProgrammeStatusBadge
                      status={
                        (trip.follow_up_status as TripFollowUpStatus) || "follow_up"
                      }
                      showDot
                      arrivalDate={trip.arrival_date}
                    />
                    <span className="client-mobile-planner-dates">
                      {formatDateRange(trip.arrival_date, trip.departure_date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ClientBottomSheet>

      <ClientBottomSheet
        open={sheet === "history"}
        title="History"
        onClose={() => setSheet(null)}
        tall
      >
        <ClientStayHistorySection initialHistory={stayHistory} variant="sheet" />
      </ClientBottomSheet>

      <ClientBottomSheet
        open={sheet === "business"}
        title="Business"
        onClose={() => setSheet(null)}
        tall
      >
        <ClientBusinessTab initialStays={businessStays} variant="compact" />
      </ClientBottomSheet>

      <ClientBottomSheet
        open={sheet === "vip"}
        title="VIP Notes"
        onClose={() => setSheet(null)}
        tall
      >
        <ClientStayHistorySection
          initialHistory={stayHistory}
          variant="vip-only"
        />
      </ClientBottomSheet>

      <ClientBottomSheet
        open={sheet === "relationship"}
        title="Relationship"
        onClose={() => setSheet(null)}
        tall
      >
        <ClientRelationshipsSection
          clientId={client.id}
          initialRelationships={relationships}
          allClients={allClients}
          variant="sheet"
        />
      </ClientBottomSheet>
    </div>
  );
}
