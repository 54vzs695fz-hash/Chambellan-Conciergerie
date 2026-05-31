import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/events/EventForm";
import { LibraryNav } from "@/components/library/LibraryNav";
import { getEvent } from "@/lib/db/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId) || eventId <= 0) notFound();
  const event = await getEvent(eventId);
  if (!event) notFound();
  const { id: _id, created_at: _c, updated_at: _u, ...initial } = event;

  return (
    <div className="page-shell max-w-4xl">
      <LibraryNav />
      <div className="mt-6 mb-8">
        <Link href="/events" className="btn-ghost mb-4 inline-block min-h-[44px]">← Events</Link>
        <h1 className="font-serif text-2xl tracking-wide">{event.name}</h1>
      </div>
      <EventForm initial={initial} eventId={event.id} />
    </div>
  );
}
