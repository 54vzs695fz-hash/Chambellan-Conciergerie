-- Rename legacy transfer activities and add transportation fields.
ALTER TABLE "activities" ADD COLUMN "transport_type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "activities" ADD COLUMN "transport_pickup" TEXT NOT NULL DEFAULT '';
ALTER TABLE "activities" ADD COLUMN "transport_destination" TEXT NOT NULL DEFAULT '';

UPDATE "activities"
SET "activity_type" = 'transportation'
WHERE "activity_type" = 'transfer';
