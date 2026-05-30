import { ClientForm } from "@/components/crm/ClientForm";
import { EMPTY_CLIENT } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function NewClientPage() {
  return (
    <div className="p-10">
      <p className="mb-4 text-sm font-medium tracking-wide text-gold uppercase">
        NEW CLIENT ROUTE OK
      </p>
      <h1 className="font-serif text-2xl tracking-wide mb-8">New client</h1>
      <ClientForm initial={EMPTY_CLIENT} />
    </div>
  );
}
