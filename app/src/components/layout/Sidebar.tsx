"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/planner", label: "Weekly Planner" },
  { href: "/clients", label: "Clients" },
  { href: "/establishments", label: "Library" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar" aria-label="Main navigation">
      <div className="app-sidebar-brand">
        <Image
          src="/brand/logo.jpg"
          alt="Chambellan"
          width={64}
          height={64}
          className="app-sidebar-logo"
        />
        <p className="app-sidebar-name">CHAMBELLAN</p>
        <p className="app-sidebar-tagline">Concierge</p>
      </div>
      <nav className="app-sidebar-nav">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`app-sidebar-link${active ? " is-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="app-sidebar-foot">Local · Private data</p>
    </aside>
  );
}
