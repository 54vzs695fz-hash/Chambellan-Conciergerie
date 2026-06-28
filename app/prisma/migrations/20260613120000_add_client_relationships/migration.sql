-- Client-to-client relationship tags.
CREATE TABLE "client_relationships" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "related_client_id" INTEGER NOT NULL,
    "relationship_type" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_relationships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_relationships_client_id_related_client_id_key" ON "client_relationships"("client_id", "related_client_id");
CREATE INDEX "client_relationships_client_id_idx" ON "client_relationships"("client_id");
CREATE INDEX "client_relationships_related_client_id_idx" ON "client_relationships"("related_client_id");

ALTER TABLE "client_relationships" ADD CONSTRAINT "client_relationships_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_relationships" ADD CONSTRAINT "client_relationships_related_client_id_fkey" FOREIGN KEY ("related_client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
