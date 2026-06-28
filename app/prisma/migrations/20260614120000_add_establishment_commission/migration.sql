-- Establishment commission engine fields.
ALTER TABLE "establishments" ADD COLUMN "commission_available" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "establishments" ADD COLUMN "commission_calc_type" TEXT NOT NULL DEFAULT 'percentage';
ALTER TABLE "establishments" ADD COLUMN "commission_percentage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "establishments" ADD COLUMN "commission_fixed_amount" TEXT NOT NULL DEFAULT '';
ALTER TABLE "establishments" ADD COLUMN "commission_calc_custom" TEXT NOT NULL DEFAULT '';
ALTER TABLE "establishments" ADD COLUMN "commission_basis" TEXT NOT NULL DEFAULT 'total_bill';
ALTER TABLE "establishments" ADD COLUMN "commission_basis_custom" TEXT NOT NULL DEFAULT '';
ALTER TABLE "establishments" ADD COLUMN "commission_eligibility" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "establishments" ADD COLUMN "commission_eligibility_custom" TEXT NOT NULL DEFAULT '';
ALTER TABLE "establishments" ADD COLUMN "commission_threshold_amount" TEXT NOT NULL DEFAULT '';
