-- AlterTable
ALTER TABLE "trips" ADD COLUMN "host_name" TEXT NOT NULL DEFAULT 'Matthieu Dubourg';
ALTER TABLE "trips" ADD COLUMN "host_phone" TEXT NOT NULL DEFAULT '+1 332 733 9543';
ALTER TABLE "trips" ADD COLUMN "host_contact" TEXT NOT NULL DEFAULT '';
