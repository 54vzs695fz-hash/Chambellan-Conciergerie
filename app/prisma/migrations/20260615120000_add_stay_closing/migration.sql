-- CreateTable
CREATE TABLE "stay_closings" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stay_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stay_closing_entries" (
    "id" SERIAL NOT NULL,
    "stay_closing_id" INTEGER NOT NULL,
    "establishment_id" INTEGER,
    "establishment_name" TEXT NOT NULL,
    "activity_ids" JSONB NOT NULL DEFAULT '[]',
    "approximate_total_bill" TEXT NOT NULL DEFAULT '',
    "food_amount" TEXT NOT NULL DEFAULT '',
    "premium_drinks_amount" TEXT NOT NULL DEFAULT '',
    "internal_notes" TEXT NOT NULL DEFAULT '',
    "calculated_commission" TEXT NOT NULL DEFAULT '',
    "commission_applied" BOOLEAN NOT NULL DEFAULT false,
    "commission_summary" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stay_closing_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stay_closings_trip_id_key" ON "stay_closings"("trip_id");

-- CreateIndex
CREATE INDEX "idx_stay_closings_trip" ON "stay_closings"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "stay_closing_entries_closing_name_key" ON "stay_closing_entries"("stay_closing_id", "establishment_name");

-- CreateIndex
CREATE INDEX "idx_stay_closing_entries_closing" ON "stay_closing_entries"("stay_closing_id");

-- AddForeignKey
ALTER TABLE "stay_closings" ADD CONSTRAINT "stay_closings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_closing_entries" ADD CONSTRAINT "stay_closing_entries_stay_closing_id_fkey" FOREIGN KEY ("stay_closing_id") REFERENCES "stay_closings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_closing_entries" ADD CONSTRAINT "stay_closing_entries_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
