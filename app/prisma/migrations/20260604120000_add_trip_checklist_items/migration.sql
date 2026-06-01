CREATE TABLE "trip_checklist_items" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'todo',
    "notes" TEXT NOT NULL DEFAULT '',
    "due_date" TEXT NOT NULL DEFAULT '',
    "reminder_date" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "trip_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_checklist_trip" ON "trip_checklist_items"("trip_id");

ALTER TABLE "trip_checklist_items" ADD CONSTRAINT "trip_checklist_items_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
