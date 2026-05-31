"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/establishments", label: "Establishments" },
  { href: "/events", label: "Events" },
  { href: "/event-venues", label: "Event Venues" },
];

export function LibraryNav() {
  const pathname = usePathname();

  return (
    <nav className="library-nav" aria-label="Library sections">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`library-nav-link${active ? " is-active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
