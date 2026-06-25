"use client";

import Link from "next/link";
import { DashboardUpcomingArrivals } from "@/components/calendar/DashboardUpcomingArrivals";
import { DashboardCalendarStats } from "@/components/calendar/DashboardCalendarStats";
import {
  DashboardAccordionSection,
  useExclusiveAccordion,
} from "@/components/dashboard/DashboardAccordionSection";
import { DashboardBookingProgress } from "@/components/dashboard/DashboardBookingProgress";
import { DashboardFollowUpSummary } from "@/components/dashboard/DashboardFollowUpSummary";
import { DashboardPaymentSummary } from "@/components/dashboard/DashboardPaymentSummary";
import { DashboardRecentPlanners } from "@/components/dashboard/DashboardRecentPlanners";
import type { BookingProgressPlanner } from "@/lib/dashboard/booking-progress";
import type { HomeSectionCounts } from "@/lib/dashboard/home-sections";
import type { DashboardProgrammeFollowUpCard, Trip } from "@/lib/types";

interface ClientPreview {
  id: number;
  full_name: string;
  nationality: string;
}

interface Props {
  trips: Trip[];
  counts: HomeSectionCounts;
  bookingProgress: BookingProgressPlanner[];
  followUpProgrammes: DashboardProgrammeFollowUpCard[];
  clients: ClientPreview[];
}

export function DashboardHomeAccordion({
  trips,
  counts,
  bookingProgress,
  followUpProgrammes,
  clients,
}: Props) {
  const { toggle, isOpen } = useExclusiveAccordion();

  return (
    <div className="dash-accordion">
      <DashboardAccordionSection
        id="booking-progress"
        title="Booking Progress"
        count={counts.bookingProgress}
        isOpen={isOpen("booking-progress")}
        onToggle={() => toggle("booking-progress")}
        dataSection="planner"
      >
        <DashboardBookingProgress embedded initialPlanners={bookingProgress} />
      </DashboardAccordionSection>

      <DashboardAccordionSection
        id="calendar-overview"
        title="Calendar Overview"
        count={counts.calendarOverview}
        isOpen={isOpen("calendar-overview")}
        onToggle={() => toggle("calendar-overview")}
        dataSection="calendar"
      >
        <DashboardCalendarStats trips={trips} />
      </DashboardAccordionSection>

      <DashboardAccordionSection
        id="upcoming-arrivals"
        title="Upcoming Arrivals"
        count={counts.upcomingArrivals}
        isOpen={isOpen("upcoming-arrivals")}
        onToggle={() => toggle("upcoming-arrivals")}
        dataSection="calendar"
      >
        <div className="dash-embedded-section">
          <div className="dash-embedded-head">
            <Link href="/calendar" className="btn-ghost">
              Open calendar
            </Link>
          </div>
          <DashboardUpcomingArrivals trips={trips} />
        </div>
      </DashboardAccordionSection>

      <DashboardAccordionSection
        id="clients-follow-up"
        title="Clients To Follow Up"
        count={counts.clientsToFollowUp}
        isOpen={isOpen("clients-follow-up")}
        onToggle={() => toggle("clients-follow-up")}
        dataSection="planner"
      >
        <DashboardFollowUpSummary
          embedded
          initialProgrammes={followUpProgrammes}
        />
      </DashboardAccordionSection>

      <DashboardAccordionSection
        id="programmes-this-week"
        title="Programmes This Week"
        count={counts.programmesThisWeek}
        isOpen={isOpen("programmes-this-week")}
        onToggle={() => toggle("programmes-this-week")}
        dataSection="planner"
      >
        <DashboardRecentPlanners embedded trips={trips} />
      </DashboardAccordionSection>

      <DashboardAccordionSection
        id="payment-summary"
        title="Payment Summary"
        count={counts.paymentSummary}
        isOpen={isOpen("payment-summary")}
        onToggle={() => toggle("payment-summary")}
        dataSection="payments"
      >
        <DashboardPaymentSummary embedded trips={trips} />
      </DashboardAccordionSection>

      <DashboardAccordionSection
        id="clients"
        title="Clients"
        count={counts.clients}
        isOpen={isOpen("clients")}
        onToggle={() => toggle("clients")}
        dataSection="clients"
      >
        <div className="dash-embedded-section">
          <div className="dash-embedded-head">
            <Link href="/clients" className="btn-ghost">
              View all
            </Link>
          </div>
          {clients.length === 0 ? (
            <p className="dash-accordion-empty text-sm text-muted">
              No clients yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {clients.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clients/${c.id}`}
                    className="dash-card dash-card--confirmed dash-list-link text-sm"
                  >
                    {c.full_name}
                    {c.nationality ? (
                      <span className="text-muted ml-2">· {c.nationality}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DashboardAccordionSection>
    </div>
  );
}
