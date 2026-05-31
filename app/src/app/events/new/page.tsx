import Link from "next/link";
import { EventForm } from "@/components/events/EventForm";
import { LibraryNav } from "@/components/library/LibraryNav";
import { EMPTY_EVENT } from "@/lib/types";

export default function NewEventPage() {
  return (
    <div className="page-shell max-w-4xl">
      <LibraryNav />
      <div className="mt-6 mb-8">
        <Link href="/events" className="btn-ghost mb-4 inline-block min-h-[44px]">← Events</Link>
        <h1 className="font-serif text-2xl tracking-wide">New event</h1>
      </div>
      <EventForm initial={EMPTY_EVENT} />
    </div>
  );
}
