import Link from "next/link";
import { EventVenueForm } from "@/components/events/EventVenueForm";
import { LibraryNav } from "@/components/library/LibraryNav";
import { EMPTY_EVENT_VENUE } from "@/lib/types";

export default function NewEventVenuePage() {
  return (
    <div className="page-shell max-w-4xl">
      <LibraryNav />
      <div className="mt-6 mb-8">
        <Link href="/event-venues" className="btn-ghost mb-4 inline-block min-h-[44px]">← Event Venues</Link>
        <h1 className="font-serif text-2xl tracking-wide">New event venue</h1>
      </div>
      <EventVenueForm initial={EMPTY_EVENT_VENUE} />
    </div>
  );
}
