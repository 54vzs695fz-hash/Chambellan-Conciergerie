"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/calendar", label: "Calendar", short: "Cal" },
  { href: "/planner", label: "Planners", short: "Plans" },
  { href: "/clients", label: "Clients", short: "Clients" },
  { href: "/establishments", label: "Library", short: "Library" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mobile-nav md:hidden"
      aria-label="Main navigation"
    >
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-link${active ? " is-active" : ""}`}
          >
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
