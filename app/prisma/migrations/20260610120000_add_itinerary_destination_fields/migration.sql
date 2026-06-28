-- AlterTable
ALTER TABLE "activities" ADD COLUMN "establishment_city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "trip_days" ADD COLUMN "destination_override" TEXT NOT NULL DEFAULT '';
