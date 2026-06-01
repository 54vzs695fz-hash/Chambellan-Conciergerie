import type { ReactNode } from "react";
import type { AdminSection } from "@/lib/theme/section-colors";

interface Props {
  section: AdminSection;
  className?: string;
}

export function SectionIcon({ section, className = "" }: Props) {
  return (
    <span
      className={`section-icon ${className}`.trim()}
      aria-hidden
    >
      {ICONS[section]}
    </span>
  );
}

const stroke = "currentColor";

const ICONS: Record<AdminSection, ReactNode> = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 6.5 8 2.5l5.5 4V13a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V6.5Z"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="2.5"
        y="3.5"
        width="11"
        height="10"
        rx="1"
        stroke={stroke}
        strokeWidth="1.1"
      />
      <path d="M2.5 6.5h11M5.5 2v2M10.5 2v2" stroke={stroke} strokeWidth="1.1" />
    </svg>
  ),
  planner: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3.5 2.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
        stroke={stroke}
        strokeWidth="1.1"
      />
      <path d="M5 6h6M5 8.5h4M5 11h5" stroke={stroke} strokeWidth="1.1" />
    </svg>
  ),
  clients: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5.5" r="2" stroke={stroke} strokeWidth="1.1" />
      <path
        d="M2.5 13v-.8c0-1.4 1.4-2.2 3.5-2.2s3.5.8 3.5 2.2V13"
        stroke={stroke}
        strokeWidth="1.1"
      />
      <path
        d="M11 6.2c1.1.2 2 1 2 2v1.3"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  ),
  library: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 3.5h3.5v9H3a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5ZM6.5 3.5H13v8.5a.5.5 0 0 1-.5.5H6.5v-9Z"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  ),
  payments: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="2"
        y="4"
        width="12"
        height="8"
        rx="1"
        stroke={stroke}
        strokeWidth="1.1"
      />
      <path d="M2 7h12" stroke={stroke} strokeWidth="1.1" />
    </svg>
  ),
  transport: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 10.5V6.8l1.2-2.4h8.6l1.2 2.4v3.7a.5.5 0 0 1-.5.5h-1.2M4 11.5a1 1 0 1 0 0 .01M11.5 11.5a1 1 0 1 0 0 .01"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  ),
  accommodation: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 13V5.8l5.5-3.3 5.5 3.3V13"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M6.5 13v-3.5h3V13" stroke={stroke} strokeWidth="1.1" />
    </svg>
  ),
  "concierge-services": (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2.5l1.4 2.8 3.1.5-2.2 2.1.5 3.1L8 9.8l-2.8 1.2.5-3.1-2.2-2.1 3.1-.5L8 2.5Z"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  ),
  reports: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 12V8M8 12V5M12 12V3" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke={stroke} strokeWidth="1.1" />
      <path
        d="M8 2.2v1.4M8 12.4v1.4M2.2 8h1.4M12.4 8h1.4M4.1 4.1l1 1M10.9 10.9l1 1M4.1 11.9l1-1M10.9 5.1l1-1"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  ),
};
