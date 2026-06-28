-- AlterTable
ALTER TABLE "trips" ADD COLUMN "multi_destination" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "trips" ADD COLUMN "destinations" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "trips" ADD COLUMN "destination_region" TEXT NOT NULL DEFAULT '';
