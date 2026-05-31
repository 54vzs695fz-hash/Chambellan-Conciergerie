"use client";

interface Props {
  open: boolean;
  itemLabel?: string;
  count?: number;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LibraryDeleteDialog({
  open,
  itemLabel = "establishment",
  count = 1,
  deleting = false,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  const message =
    count === 1 && itemLabel === "establishment"
      ? "Are you sure you want to delete this establishment?"
      : count === 1
        ? `Are you sure you want to delete this ${itemLabel}?`
        : `Are you sure you want to delete ${count} ${itemLabel}s?`;

  return (
    <div
      className="est-dialog-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel();
      }}
    >
      <div
        className="est-dialog-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="est-delete-dialog-title"
      >
        <h2 id="est-delete-dialog-title" className="font-serif text-xl tracking-wide mb-2">
          Confirm deletion
        </h2>
        <p className="text-sm text-muted mb-6">{message}</p>
        <div className="est-dialog-actions">
          <button
            type="button"
            className="btn-secondary min-h-[44px]"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="est-dialog-delete-btn min-h-[44px]"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
