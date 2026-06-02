"use client";

import { useEffect, useId, useState } from "react";
import type { PlannerExportVariant } from "@/lib/planner/planner-sheet-model";
import { sanitizePdfFilename } from "@/lib/planner/planner-pdf-filename";

interface Props {
  open: boolean;
  mode: PlannerExportVariant;
  defaultFilename: string;
  loading: boolean;
  onConfirm: (filename: string) => void;
  onCancel: () => void;
}

export function PlannerPdfExportModal({
  open,
  mode,
  defaultFilename,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const inputId = useId();
  const [filename, setFilename] = useState(defaultFilename);

  useEffect(() => {
    if (open) setFilename(defaultFilename);
  }, [open, defaultFilename]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    document.body.classList.add("lux-pdf-export-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("lux-pdf-export-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const modeLabel = mode === "client" ? "Client" : "Concierge";

  return (
    <div className="lux-pdf-export-root md:hidden" role="presentation">
      <button
        type="button"
        className="lux-pdf-export-backdrop"
        aria-label="Close export dialog"
        disabled={loading}
        onClick={onCancel}
      />
      <div
        className="lux-pdf-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="lux-pdf-export-title">
          Export PDF
        </h2>
        <p className="lux-pdf-export-subtitle">{modeLabel} planner export</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (loading) return;
            onConfirm(sanitizePdfFilename(filename));
          }}
        >
          <label htmlFor={inputId} className="lux-pdf-export-label">
            File name
          </label>
          <input
            id={inputId}
            className="adm-input lux-pdf-export-input"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
          <div className="lux-pdf-export-actions">
            <button
              type="button"
              className="lux-btn lux-btn--ghost lux-pdf-export-btn"
              disabled={loading}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="lux-btn lux-btn--gold lux-pdf-export-btn"
              disabled={loading}
            >
              {loading ? "Generating PDF…" : "Export"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
