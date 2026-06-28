"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  tall?: boolean;
}

export function ClientBottomSheet({
  open,
  title,
  onClose,
  children,
  tall = false,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("client-sheet-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("client-sheet-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="client-sheet-root" role="presentation">
      <button
        type="button"
        className="client-sheet-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`client-sheet-panel${tall ? " client-sheet-panel--tall" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="client-sheet-head">
          <h2 className="client-sheet-title">{title}</h2>
          <button
            type="button"
            className="client-sheet-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="client-sheet-body">{children}</div>
      </div>
    </div>
  );
}
