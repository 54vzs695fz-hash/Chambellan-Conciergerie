"use client";

import { useEffect, useState } from "react";
import { StayClosingDialog } from "./StayClosingDialog";

interface Props {
  tripId: number;
  isClosed?: boolean;
}

export function CloseStayButton({ tripId, isClosed = false }: Props) {
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(isClosed);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/trips/${tripId}/stay-closing`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.closing) setClosed(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  return (
    <>
      <button
        type="button"
        className="stay-closing-btn min-h-[44px]"
        onClick={() => setOpen(true)}
      >
        {closed ? "View stay closing" : "Close stay"}
      </button>

      <StayClosingDialog
        tripId={tripId}
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => setClosed(true)}
      />
    </>
  );
}
