-- AlterTable
ALTER TABLE "activities" ADD COLUMN "assigned_to" TEXT NOT NULL DEFAULT '';
ALTER TABLE "activities" ADD COLUMN "booking_notes" TEXT NOT NULL DEFAULT '';
