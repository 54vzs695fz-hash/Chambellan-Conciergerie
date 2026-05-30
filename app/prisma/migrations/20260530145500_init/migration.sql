-- CreateSchema
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "nationality" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "preferences" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trips" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER,
    "client_name" TEXT NOT NULL DEFAULT '',
    "destination" TEXT NOT NULL DEFAULT '',
    "arrival_date" TEXT NOT NULL DEFAULT '',
    "departure_date" TEXT NOT NULL DEFAULT '',
    "hotel" TEXT NOT NULL DEFAULT '',
    "villa" TEXT NOT NULL DEFAULT '',
    "driver" TEXT NOT NULL DEFAULT '',
    "butler" TEXT NOT NULL DEFAULT '',
    "security" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "driver_name" TEXT NOT NULL DEFAULT '',
    "driver_phone" TEXT NOT NULL DEFAULT '',
    "butler_name" TEXT NOT NULL DEFAULT '',
    "butler_phone" TEXT NOT NULL DEFAULT '',
    "security_contact" TEXT NOT NULL DEFAULT '',
    "emergency_contact" TEXT NOT NULL DEFAULT '',
    "yacht" TEXT NOT NULL DEFAULT '',
    "jet" TEXT NOT NULL DEFAULT '',
    "restaurant_reservations" TEXT NOT NULL DEFAULT '',
    "club_reservations" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trip_days" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "sections" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "trip_days_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activities" (
    "id" SERIAL NOT NULL,
    "trip_day_id" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL DEFAULT 'activity',
    "time" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_trips_client" ON "trips"("client_id");

CREATE UNIQUE INDEX "trip_days_trip_id_date_key" ON "trip_days"("trip_id", "date");

CREATE INDEX "idx_trip_days_trip" ON "trip_days"("trip_id");

CREATE INDEX "idx_activities_day" ON "activities"("trip_day_id");

ALTER TABLE "trips" ADD CONSTRAINT "trips_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "trip_days" ADD CONSTRAINT "trip_days_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activities" ADD CONSTRAINT "activities_trip_day_id_fkey" FOREIGN KEY ("trip_day_id") REFERENCES "trip_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
