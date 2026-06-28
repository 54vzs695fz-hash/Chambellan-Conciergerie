"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  clientId: number;
  clientName: string;
  linkedPlannerCount: number;
  variant?: "default" | "mobile-menu";
}

export function ClientDeleteButton({
  clientId,
  clientName,
  linkedPlannerCount,
  variant = "default",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmText.trim() === "DELETE";

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setConfirmText("");
    setError(null);
  };

  const handleDelete = async () => {
    if (!canConfirm) return;
    setDeleting(true);
    setError(null);

    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      setError("Could not delete this client. Please try again.");
      return;
    }

    router.push("/clients");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        className={
          variant === "mobile-menu"
            ? "client-mobile-more-item client-mobile-more-item--danger"
            : "crm-delete-btn min-h-[44px]"
        }
        onClick={() => setOpen(true)}
      >
        {variant === "mobile-menu" ? (
          <>
            <span className="client-mobile-more-label">Delete client</span>
            <span className="client-mobile-more-subtitle">
              Permanently remove this profile
            </span>
          </>
        ) : (
          "Delete client"
        )}
      </button>

      {open ? (
        <div
          className="est-dialog-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !deleting) close();
          }}
        >
          <div
            className="est-dialog-panel crm-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="crm-delete-dialog-title"
          >
            <h2
              id="crm-delete-dialog-title"
              className="font-serif text-xl tracking-wide mb-2"
            >
              Delete client profile
            </h2>
            <p className="text-sm text-muted mb-3">
              Are you sure you want to delete this client profile?
            </p>
            <p className="text-sm font-medium mb-3">{clientName}</p>
            {linkedPlannerCount > 0 ? (
              <p className="crm-delete-warning text-sm mb-4" role="status">
                This client has linked planners. They will become unlinked.
              </p>
            ) : null}
            <label className="crm-delete-confirm-field">
              <span className="field-label">
                Type <strong>DELETE</strong> to confirm
              </span>
              <input
                className="field-input"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                autoCapitalize="characters"
                disabled={deleting}
                aria-label="Type DELETE to confirm"
              />
            </label>
            {error ? (
              <p className="text-sm text-red-700 mt-3" role="alert">
                {error}
              </p>
            ) : null}
            <div className="est-dialog-actions mt-6">
              <button
                type="button"
                className="btn-secondary min-h-[44px]"
                onClick={close}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="est-dialog-delete-btn min-h-[44px]"
                onClick={() => void handleDelete()}
                disabled={!canConfirm || deleting}
              >
                {deleting ? "Deleting…" : "Delete client"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
