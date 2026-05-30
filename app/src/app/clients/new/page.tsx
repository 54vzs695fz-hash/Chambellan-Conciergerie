import { ClientForm } from "@/components/crm/ClientForm";
import { EMPTY_CLIENT } from "@/lib/types";

export default function NewClientPage() {
  return (
    <div className="p-10">
      <h1 className="font-serif text-2xl tracking-wide mb-8">New client</h1>
      <ClientForm initial={EMPTY_CLIENT} />
    </div>
  );
}
