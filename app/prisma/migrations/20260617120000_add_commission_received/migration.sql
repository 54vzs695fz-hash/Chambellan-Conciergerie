-- AlterTable
ALTER TABLE "stay_closing_entries" ADD COLUMN "commission_received" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stay_closing_entries" ADD COLUMN "commission_received_at" TEXT NOT NULL DEFAULT '';
