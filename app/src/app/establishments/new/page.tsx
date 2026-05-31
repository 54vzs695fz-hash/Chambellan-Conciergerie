import Link from "next/link";
import { EstablishmentForm } from "@/components/establishments/EstablishmentForm";
import { EMPTY_ESTABLISHMENT } from "@/lib/types";

export default function NewEstablishmentPage() {
  return (
    <div className="page-shell max-w-4xl">
      <div className="mb-8">
        <Link href="/establishments" className="btn-ghost mb-4 inline-block min-h-[44px]">
          ← Library
        </Link>
        <h1 className="font-serif text-2xl tracking-wide">New establishment</h1>
        <p className="text-sm text-muted mt-1">
          Essential details only — expand Advanced details for more fields.
        </p>
      </div>
      <EstablishmentForm initial={EMPTY_ESTABLISHMENT} />
    </div>
  );
}
