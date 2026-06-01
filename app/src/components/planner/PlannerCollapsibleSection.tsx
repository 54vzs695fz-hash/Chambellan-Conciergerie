"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

function useIsMobilePlanner(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

interface Props {
  title: string;
  desktopTitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  wide?: boolean;
}

export function PlannerCollapsibleSection({
  title,
  desktopTitle,
  children,
  defaultOpen = false,
  wide = false,
}: Props) {
  const isMobile = useIsMobilePlanner();
  const [open, setOpen] = useState(defaultOpen);
  const desktopLabel = desktopTitle ?? title;

  useEffect(() => {
    if (isMobile) setOpen(defaultOpen);
  }, [isMobile, defaultOpen]);

  const panelClass = `adm-panel${wide ? " adm-panel--wide" : ""}`;

  if (!isMobile) {
    return (
      <section className={panelClass}>
        <h2 className="adm-panel-title">{desktopLabel}</h2>
        {children}
      </section>
    );
  }

  return (
    <section
      className={`${panelClass} adm-panel--collapsible${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="adm-panel-toggle min-h-[44px]"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="adm-panel-toggle-label">{title}</span>
        <span className="adm-panel-chevron" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? <div className="adm-panel-body">{children}</div> : null}
    </section>
  );
}
