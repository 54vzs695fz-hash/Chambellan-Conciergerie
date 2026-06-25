"use client";

import { useId, useState } from "react";

export interface DashboardAccordionSectionProps {
  id: string;
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  dataSection?: string;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`dash-accordion-chevron${open ? " is-open" : ""}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 3.5L9 7L5 10.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardAccordionSection({
  id,
  title,
  count,
  isOpen,
  onToggle,
  children,
  dataSection,
}: DashboardAccordionSectionProps) {
  const panelId = useId();

  return (
    <section
      className={`dash-accordion-section${isOpen ? " is-open" : ""}`}
      data-section={dataSection}
    >
      <button
        type="button"
        className="dash-accordion-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="dash-accordion-trigger-main">
          <ChevronIcon open={isOpen} />
          <span className="dash-accordion-title">{title}</span>
        </span>
        <span className="dash-accordion-count" aria-label={`${count} items`}>
          {count}
        </span>
      </button>

      <div
        id={panelId}
        className={`dash-accordion-panel${isOpen ? " is-open" : ""}`}
        aria-hidden={!isOpen}
        {...(!isOpen ? { inert: true } : {})}
      >
        <div className="dash-accordion-panel-inner">{children}</div>
      </div>
    </section>
  );
}

export function useExclusiveAccordion(initialOpen: string | null = null) {
  const [openId, setOpenId] = useState<string | null>(initialOpen);

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  function isOpen(id: string) {
    return openId === id;
  }

  return { openId, toggle, isOpen };
}
