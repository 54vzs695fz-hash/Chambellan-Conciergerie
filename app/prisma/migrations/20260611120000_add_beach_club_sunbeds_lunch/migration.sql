-- AlterTable
ALTER TABLE "activities" ADD COLUMN "beach_sunbeds" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "activities" ADD COLUMN "beach_sunbeds_time" TEXT NOT NULL DEFAULT '';
ALTER TABLE "activities" ADD COLUMN "beach_lunch" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "activities" ADD COLUMN "beach_lunch_time" TEXT NOT NULL DEFAULT '';
ALTER TABLE "activities" ADD COLUMN "beach_sunbeds_status" TEXT NOT NULL DEFAULT 'to_request';
ALTER TABLE "activities" ADD COLUMN "beach_lunch_status" TEXT NOT NULL DEFAULT 'to_request';
