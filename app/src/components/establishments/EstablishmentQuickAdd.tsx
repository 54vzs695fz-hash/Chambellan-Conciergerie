"use client";

import { useCallback, useEffect } from "react";
import type { Establishment } from "@/lib/types";
import { EMPTY_ESTABLISHMENT } from "@/lib/types";
import { EstablishmentForm } from "./EstablishmentForm";

export function EstablishmentQuickAdd({
  open,
  onClose,
  onSaved,
  defaultCity = "",
  defaultCategory = "restaurant",
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (establishment: Establishment) => void;
  defaultCity?: string;
  defaultCategory?: string;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const initial = {
    ...EMPTY_ESTABLISHMENT,
    category: defaultCategory,
    city: defaultCity,
  };

  return (
    <div
      className="est-quick-add-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="est-quick-add-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="est-quick-add-title"
      >
        <div className="est-quick-add-header">
          <div>
            <p className="section-title mb-1">Quick add</p>
            <h2 id="est-quick-add-title" className="font-serif text-xl tracking-wide">
              New establishment
            </h2>
          </div>
          <button
            type="button"
            className="est-quick-add-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <EstablishmentForm
          key={`${open}-${defaultCity}-${defaultCategory}`}
          initial={initial}
          variant="quick"
          onCancel={onClose}
          onSaved={(est, options) => {
            onSaved(est);
            if (!options?.keepOpen) onClose();
          }}
        />
      </div>
    </div>
  );
}
