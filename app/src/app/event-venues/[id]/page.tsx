import Link from "next/link";
import { notFound } from "next/navigation";
import { EventVenueForm } from "@/components/events/EventVenueForm";
import { LibraryNav } from "@/components/library/LibraryNav";
import { getEventVenue } from "@/lib/db/event-venues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EventVenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isFinite(venueId) || venueId <= 0) notFound();
  const venue = await getEventVenue(venueId);
  if (!venue) notFound();
  const { id: _id, created_at: _c, updated_at: _u, event_name: _en, ...initial } = venue;

  return (
    <div className="page-shell max-w-4xl">
      <LibraryNav />
      <div className="mt-6 mb-8">
        <Link href="/event-venues" className="btn-ghost mb-4 inline-block min-h-[44px]">← Event Venues</Link>
        <h1 className="font-serif text-2xl tracking-wide">{venue.name}</h1>
      </div>
      <EventVenueForm initial={initial} venueId={venue.id} />
    </div>
  );
}
