"use client";

import Link from "next/link";
import { useState } from "react";
import { ClientBottomSheet } from "@/components/crm/ClientBottomSheet";
import { ClientBusinessTab } from "@/components/crm/ClientBusinessTab";
import { ClientDeleteButton } from "@/components/crm/ClientDeleteButton";
import { ClientMobileArchiveList } from "@/components/crm/ClientMobileArchiveList";
import { ClientMobileDocumentsList } from "@/components/crm/ClientMobileDocumentsList";
import { ClientMobileHistoryPanel } from "@/components/crm/ClientMobileHistoryPanel";
import { ClientRelationshipsSection } from "@/components/crm/ClientRelationshipsSection";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import { buildClientWhatsAppUrl } from "@/lib/crm/whatsapp";
import type { ClientTripSummary } from "@/lib/db/clients";
import { formatDateRange } from "@/lib/planner-utils";
import type {
  Client,
  ClientBusinessStay,
  ClientRelationshipWithClient,
  ClientStayHistoryItem,
  TripFollowUpStatus,
} from "@/lib/types";

type SheetId =
  | "history"
  | "more"
  | "planner-list"
  | "business"
  | "relationships"
  | "documents"
  | "archive";

interface Props {
  client: Client;
  stayHistory: ClientStayHistoryItem[];
  businessStays: ClientBusinessStay[];
  activeTrips: ClientTripSummary[];
  allTrips: ClientTripSummary[];
  relationships: ClientRelationshipWithClient[];
  allClients: Pick<Client, "id" | "full_name">[];
  linkedPlannerCount: number;
  createPlannerForm: React.ReactNode;
}

const MORE_ITEMS: { id: SheetId; label: string; subtitle: string }[] = [
  { id: "business", label: "Business", subtitle: "Commissions & billing" },
  { id: "relationships", label: "Relationships", subtitle: "Linked clients" },
  { id: "documents", label: "Documents", subtitle: "Planners & PDFs" },
  { id: "archive", label: "Archive client", subtitle: "Completed programmes" },
];

function contactValue(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function ClientMobileHub({
  client,
  stayHistory,
  businessStays,
  activeTrips,
  allTrips,
  relationships,
  allClients,
  linkedPlannerCount,
  createPlannerForm,
}: Props) {
  const [sheet, setSheet] = useState<SheetId | null>(null);

  const whatsappRaw = client.whatsapp.trim();
  const phoneRaw = client.phone.trim();
  const whatsappNumber = whatsappRaw || phoneRaw;
  const whatsappUrl = buildClientWhatsAppUrl(whatsappNumber);
  const phoneDisplay = contactValue(phoneRaw, "—");
  const emailDisplay = contactValue(client.email, "—");
  const whatsappDisplay = contactValue(whatsappRaw, phoneRaw ? phoneRaw : "—");

  const primaryTrip = activeTrips[0] ?? null;
  const plannerSubtitle = primaryTrip
    ? `${primaryTrip.destination || "Untitled"} · ${formatDateRange(primaryTrip.arrival_date, primaryTrip.departure_date)}`
    : "Create the first programme";

  const historySubtitle =
    stayHistory.length > 0
      ? `${stayHistory.length} previous stay${stayHistory.length === 1 ? "" : "s"}`
      : "Stays, notes & preferences";

  const openMoreItem = (id: SheetId) => {
    setSheet(id);
  };

  return (
    <div className="client-mobile-hub">
      <header className="client-mobile-head">
        <h1 className="client-mobile-name">{client.full_name}</h1>
        <dl className="client-mobile-contacts">
          <div className="client-mobile-contact">
            <dt>WhatsApp</dt>
            <dd>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="client-mobile-contact-link"
                >
                  {whatsappDisplay}
                </a>
              ) : (
                whatsappDisplay
              )}
            </dd>
          </div>
          <div className="client-mobile-contact">
            <dt>Phone</dt>
            <dd>
              {phoneRaw ? (
                <a href={`tel:${phoneRaw}`} className="client-mobile-contact-link">
                  {phoneDisplay}
                </a>
              ) : (
                phoneDisplay
              )}
            </dd>
          </div>
          <div className="client-mobile-contact">
            <dt>Email</dt>
            <dd>
              {client.email.trim() ? (
                <a
                  href={`mailto:${client.email.trim()}`}
                  className="client-mobile-contact-link"
                >
                  {emailDisplay}
                </a>
              ) : (
                emailDisplay
              )}
            </dd>
          </div>
        </dl>
      </header>

      <div className="client-mobile-cards">
        {primaryTrip && activeTrips.length === 1 ? (
          <Link href={`/planner/${primaryTrip.id}`} className="client-mobile-card">
            <span className="client-mobile-card-title">Planner</span>
            <span className="client-mobile-card-subtitle">{plannerSubtitle}</span>
            <span className="client-mobile-card-action">Open current planner</span>
          </Link>
        ) : primaryTrip && activeTrips.length > 1 ? (
          <button
            type="button"
            className="client-mobile-card"
            onClick={() => setSheet("planner-list")}
          >
            <span className="client-mobile-card-title">Planner</span>
            <span className="client-mobile-card-subtitle">
              {activeTrips.length} active programmes
            </span>
            <span className="client-mobile-card-action">Choose planner</span>
          </button>
        ) : (
          <div className="client-mobile-card client-mobile-card--planner">
            <span className="client-mobile-card-title">Planner</span>
            <span className="client-mobile-card-subtitle">{plannerSubtitle}</span>
            <div className="client-mobile-card-form">{createPlannerForm}</div>
          </div>
        )}

        <button
          type="button"
          className="client-mobile-card"
          onClick={() => setSheet("history")}
        >
          <span className="client-mobile-card-title">Client History</span>
          <span className="client-mobile-card-subtitle">{historySubtitle}</span>
          <span className="client-mobile-card-action">View history</span>
        </button>

        <button
          type="button"
          className="client-mobile-card"
          onClick={() => setSheet("more")}
        >
          <span className="client-mobile-card-title">More</span>
          <span className="client-mobile-card-subtitle">
            Business, relationships & admin
          </span>
          <span className="client-mobile-card-action">Open menu</span>
        </button>
      </div>

      <ClientBottomSheet
        open={sheet === "planner-list"}
        title="Planner"
        onClose={() => setSheet(null)}
      >
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
      </ClientBottomSheet>

      <ClientBottomSheet
        open={sheet === "history"}
        title="Client History"
        onClose={() => setSheet(null)}
        tall
      >
        <ClientMobileHistoryPanel
          client={client}
          stayHistory={stayHistory}
        />
      </ClientBottomSheet>

      <ClientBottomSheet
        open={sheet === "more"}
        title="More"
        onClose={() => setSheet(null)}
      >
        <ul className="client-mobile-more-list">
          {MORE_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="client-mobile-more-item"
                onClick={() => openMoreItem(item.id)}
              >
                <span className="client-mobile-more-label">{item.label}</span>
                <span className="client-mobile-more-subtitle">{item.subtitle}</span>
              </button>
            </li>
          ))}
          <li className="client-mobile-more-divider" aria-hidden />
          <li>
            <ClientDeleteButton
              clientId={client.id}
              clientName={client.full_name}
              linkedPlannerCount={linkedPlannerCount}
              variant="mobile-menu"
            />
          </li>
        </ul>
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
        open={sheet === "relationships"}
        title="Relationships"
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

      <ClientBottomSheet
        open={sheet === "documents"}
        title="Documents"
        onClose={() => setSheet(null)}
        tall
      >
        <ClientMobileDocumentsList trips={allTrips} />
      </ClientBottomSheet>

      <ClientBottomSheet
        open={sheet === "archive"}
        title="Archive client"
        onClose={() => setSheet(null)}
        tall
      >
        <ClientMobileArchiveList trips={allTrips} />
      </ClientBottomSheet>
    </div>
  );
}
