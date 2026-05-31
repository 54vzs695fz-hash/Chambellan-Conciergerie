-- Establishment favorites
ALTER TABLE "establishments" ADD COLUMN "is_favorite" BOOLEAN NOT NULL DEFAULT false;

-- Trip event fields
ALTER TABLE "trips" ADD COLUMN "event_booking" TEXT NOT NULL DEFAULT '';
ALTER TABLE "trips" ADD COLUMN "event_venue" TEXT NOT NULL DEFAULT '';

-- Events library
CREATE TABLE "concierge_events" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "start_date" TEXT NOT NULL DEFAULT '',
    "end_date" TEXT NOT NULL DEFAULT '',
    "contact_name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "internal_notes" TEXT NOT NULL DEFAULT '',
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concierge_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_events_category" ON "concierge_events"("category");
CREATE INDEX "idx_events_destination" ON "concierge_events"("destination");
CREATE INDEX "idx_events_name" ON "concierge_events"("name");

-- Event venues
CREATE TABLE "event_venues" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER,
    "name" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "internal_notes" TEXT NOT NULL DEFAULT '',
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_venues_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "event_venues" ADD CONSTRAINT "event_venues_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "concierge_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_event_venues_event" ON "event_venues"("event_id");
CREATE INDEX "idx_event_venues_destination" ON "event_venues"("destination");
CREATE INDEX "idx_event_venues_name" ON "event_venues"("name");
