import Link from "next/link";
import { DashboardHomeAccordion } from "@/components/dashboard/DashboardHomeAccordion";
import { computeHomeSectionCounts } from "@/lib/dashboard/home-sections";
import { getBusinessDashboardBadgeCount } from "@/lib/db/business-dashboard";
import { listBookingProgressPlanners } from "@/lib/dashboard/booking-progress";
import { listDashboardFollowUpItems } from "@/lib/db/checklist";
import { listClients } from "@/lib/db/clients";
import { listConfirmedTripsWithDays, listTrips } from "@/lib/db/trips";
import "@/app/calendar/calendar.css";
import "@/app/dashboard.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const allTrips = await listTrips();
  const allClients = await listClients();
  const clients = allClients.slice(0, 5);
  const pendingFollowUp = await listDashboardFollowUpItems();
  const confirmedTrips = await listConfirmedTripsWithDays();
  const bookingProgress = listBookingProgressPlanners(confirmedTrips);
  const businessDashboardCount = await getBusinessDashboardBadgeCount();
  const counts = computeHomeSectionCounts({
    trips: allTrips,
    confirmedTrips,
    followUpProgrammes: pendingFollowUp,
    clientCount: clients.length,
    businessDashboard: businessDashboardCount,
  });

  return (
    <div className="page-shell max-w-4xl">
      <header className="mb-10">
        <h1 className="font-serif text-3xl tracking-wide text-ink mb-2">
          Chambellan Concierge
        </h1>
        <p className="text-sm text-muted max-w-md">
          Your private operating system for weekly programmes, client profiles,
          and luxury PDF itineraries.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 mb-12">
        <Link href="/planner/new" className="dash-action dash-action--follow-up">
          New weekly planner
        </Link>
        <Link href="/clients/new" className="dash-action dash-action--confirmed">
          New client
        </Link>
        <Link href="/establishments/new" className="dash-action dash-action--library">
          New establishment
        </Link>
      </div>

      <DashboardHomeAccordion
        trips={allTrips}
        counts={counts}
        bookingProgress={bookingProgress}
        followUpProgrammes={pendingFollowUp}
        clients={clients}
      />
    </div>
  );
}
