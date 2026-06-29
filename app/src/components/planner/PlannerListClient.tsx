"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { IconTrash } from "@/components/establishments/EstablishmentLibraryIcons";
import { LibraryDeleteDialog } from "@/components/library/LibraryDeleteDialog";
import { PlannerArrivalCountdown } from "@/components/planner/PlannerArrivalCountdown";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import { PaymentStatusPicker } from "@/components/status/PaymentStatusPicker";
import { normalizeTripPaymentStatus } from "@/lib/planner/payment-status";
import { formatDateRange, isUntitledDestination } from "@/lib/planner-utils";
import type { Trip, TripPaymentStatus } from "@/lib/types";

type DeleteMode =
  | { type: "single"; id: number }
  | { type: "bulk-untitled"; count: number }
  | null;

function displayDestination(destination: string): string {
  return destination.trim() || "Untitled destination";
}

interface Props {
  initialTrips: Trip[];
}

export function PlannerListClient({ initialTrips }: Props) {
  const [trips, setTrips] = useState(initialTrips);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(
    null
  );
  const [paymentErrors, setPaymentErrors] = useState<Record<number, string>>(
    {}
  );

  const untitledCount = useMemo(
    () => trips.filter((t) => isUntitledDestination(t.destination)).length,
    [trips]
  );

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/trips");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setTrips(data);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const handlePaymentStatusChange = async (
    id: number,
    status: TripPaymentStatus
  ) => {
    const previous = normalizeTripPaymentStatus(
      trips.find((trip) => trip.id === id)?.payment_status
    );
    if (previous === status) return;

    setUpdatingPaymentId(id);
    setPaymentErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTrips((prev) =>
      prev.map((trip) =>
        trip.id === id ? { ...trip, payment_status: status } : trip
      )
    );
    try {
      const res = await fetch(`/api/trips/${id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: status }),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch {
      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === id ? { ...trip, payment_status: previous } : trip
        )
      );
      setPaymentErrors((prev) => ({
        ...prev,
        [id]: "Could not save.",
      }));
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const performDelete = async () => {
    if (!deleteMode) return;
    setDeleting(true);
    try {
      if (deleteMode.type === "single") {
        const res = await fetch(`/api/trips/${deleteMode.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        setTrips((prev) => prev.filter((t) => t.id !== deleteMode.id));
        showToast("Planner deleted.");
      } else {
        const res = await fetch("/api/trips/cleanup-untitled", { method: "POST" });
        if (!res.ok) throw new Error("Bulk delete failed");
        await refreshList();
        showToast(`${deleteMode.count} planners deleted.`);
      }
      setDeleteMode(null);
    } catch {
      showToast("Could not delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const deleteMessage =
    deleteMode?.type === "single"
      ? "Are you sure you want to delete this planner?"
      : deleteMode?.type === "bulk-untitled"
        ? `Are you sure you want to delete all ${deleteMode.count} Untitled destination planners? This cannot be undone.`
        : undefined;

  return (
    <>
      {toast ? (
        <p className="est-save-toast" role="status">
          {toast}
        </p>
      ) : null}

      <LibraryDeleteDialog
        open={deleteMode !== null}
        message={deleteMessage}
        deleting={deleting}
        onCancel={() => {
          if (!deleting) setDeleteMode(null);
        }}
        onConfirm={() => void performDelete()}
      />

      {untitledCount > 0 ? (
        <div className="planner-list-bulk-bar">
          <p className="planner-list-bulk-copy">
            {untitledCount} Untitled destination planner
            {untitledCount === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            className="planner-list-bulk-btn min-h-[44px]"
            onClick={() =>
              setDeleteMode({ type: "bulk-untitled", count: untitledCount })
            }
          >
            Delete all untitled
          </button>
        </div>
      ) : null}

      {trips.length === 0 ? (
        <p className="text-muted text-sm">Create your first weekly planner.</p>
      ) : (
        <ul className="planner-list space-y-2 max-w-2xl">
          {trips.map((t) => (
            <li key={t.id} className="planner-list-row card">
              <Link href={`/planner/${t.id}`} className="planner-list-link">
                <div className="planner-list-body">
                  <p className="planner-list-dates">
                    {formatDateRange(t.arrival_date, t.departure_date)}
                  </p>
                  {t.client_name?.trim() ? (
                    <p className="planner-list-client">{t.client_name}</p>
                  ) : null}
                  <p className="planner-list-destination font-serif text-gold tracking-wide">
                    {displayDestination(t.destination)}
                  </p>
                  <PlannerArrivalCountdown
                    arrivalDate={t.arrival_date}
                    departureDate={t.departure_date}
                  />
                  <div
                    className="planner-list-status"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <ProgrammeStatusBadge
                      status={t.follow_up_status ?? "follow_up"}
                    />
                    <PaymentStatusPicker
                      status={normalizeTripPaymentStatus(t.payment_status)}
                      arrivalDate={t.arrival_date}
                      saving={updatingPaymentId === t.id}
                      error={paymentErrors[t.id] ?? null}
                      onSelect={(status) =>
                        void handlePaymentStatusChange(t.id, status)
                      }
                    />
                  </div>
                </div>
              </Link>
              <button
                type="button"
                className="planner-list-delete min-h-[44px] min-w-[44px]"
                onClick={() => setDeleteMode({ type: "single", id: t.id })}
                aria-label={`Delete ${displayDestination(t.destination)}`}
              >
                <IconTrash />
                <span className="planner-list-delete-label">Delete</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
