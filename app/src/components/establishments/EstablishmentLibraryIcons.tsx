export function IconStar({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2.5l2.76 5.59 6.17.9-4.47 4.35 1.06 6.15L12 16.98l-5.52 2.9 1.06-6.15-4.47-4.35 6.17-.9L12 2.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function IconPencil() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a1.8 1.8 0 0 0 0-2.55l-1.45-1.45a1.8 1.8 0 0 0-2.55 0L4 16v4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l3 3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconTrash() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 13h10l1-13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMore() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
