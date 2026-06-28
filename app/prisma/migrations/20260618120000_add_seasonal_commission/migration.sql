-- AlterTable
ALTER TABLE "establishments" ADD COLUMN "seasonal_commission_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "establishments" ADD COLUMN "seasonal_commission_start" TEXT NOT NULL DEFAULT '';
ALTER TABLE "establishments" ADD COLUMN "seasonal_commission_end" TEXT NOT NULL DEFAULT '';
ALTER TABLE "establishments" ADD COLUMN "seasonal_commission_target" TEXT NOT NULL DEFAULT '';
ALTER TABLE "establishments" ADD COLUMN "seasonal_commission_after_target" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "stay_closing_entries" ADD COLUMN "commission_pending_season_target" BOOLEAN NOT NULL DEFAULT false;
