import { CalendarPageClient } from "@/components/calendar/CalendarPageClient";
import { listTrips } from "@/lib/db/trips";
import "./calendar.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ programme?: string }>;
}) {
  const trips = await listTrips();
  const params = await searchParams;
  const programmeId = params.programme ? Number(params.programme) : null;
  const initialProgrammeId =
    programmeId && Number.isFinite(programmeId) ? programmeId : null;

  return (
    <div className="page-shell cal-shell">
      <header className="cal-header mb-6">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">Calendar</h1>
          <p className="text-sm text-muted mt-1">
            All client programmes — arrivals, follow-ups, and planning
          </p>
        </div>
      </header>

      <CalendarPageClient
        initialTrips={trips}
        initialProgrammeId={initialProgrammeId}
      />
    </div>
  );
}
