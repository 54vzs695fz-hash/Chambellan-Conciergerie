-- AlterTable
ALTER TABLE "trips" ADD COLUMN "payment_status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "trips" ADD COLUMN "total_amount" TEXT NOT NULL DEFAULT '';
ALTER TABLE "trips" ADD COLUMN "amount_received" TEXT NOT NULL DEFAULT '';
ALTER TABLE "trips" ADD COLUMN "payment_method" TEXT NOT NULL DEFAULT '';
ALTER TABLE "trips" ADD COLUMN "payment_notes" TEXT NOT NULL DEFAULT '';
