import Link from "next/link";
import { notFound } from "next/navigation";
import { EstablishmentForm } from "@/components/establishments/EstablishmentForm";
import { getEstablishmentSeasonProgress } from "@/lib/db/client-business";
import { getEstablishment } from "@/lib/db/establishments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EstablishmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const establishmentId = Number(id);
  if (!Number.isFinite(establishmentId) || establishmentId <= 0) notFound();

  const establishment = await getEstablishment(establishmentId);
  if (!establishment) notFound();

  const seasonProgress = await getEstablishmentSeasonProgress(establishmentId);

  const { id: _id, created_at: _c, updated_at: _u, ...initial } = establishment;

  return (
    <div className="page-shell max-w-4xl">
      <div className="mb-8">
        <Link href="/establishments" className="btn-ghost mb-4 inline-block min-h-[44px]">
          ← Library
        </Link>
        <h1 className="font-serif text-2xl tracking-wide">{establishment.name}</h1>
        <p className="text-sm text-muted mt-1">
          Essential details — expand Advanced details for address, social, tags, and internal notes.
        </p>
      </div>
      <EstablishmentForm
        initial={initial}
        establishmentId={establishment.id}
        seasonProgress={seasonProgress}
      />
    </div>
  );
}
