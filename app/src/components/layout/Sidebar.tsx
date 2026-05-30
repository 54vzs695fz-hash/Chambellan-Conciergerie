"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/planner", label: "Weekly Planner" },
  { href: "/clients", label: "Clients" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen border-r border-sand/80 bg-white flex flex-col shrink-0">
      <div className="px-5 pt-8 pb-6 border-b border-sand/60 text-center">
        <Image
          src="/brand/logo.jpg"
          alt="Chambellan"
          width={64}
          height={64}
          className="mx-auto mb-3 rounded-sm"
        />
        <p className="font-serif text-sm tracking-[0.2em] text-ink">CHAMBELLAN</p>
        <p className="text-[9px] tracking-[0.35em] text-muted mt-0.5 uppercase">
          Concierge
        </p>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-0.5">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] rounded-sm transition-colors ${
                active
                  ? "bg-beige text-gold"
                  : "text-muted hover:text-ink hover:bg-cream"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-4 text-[9px] text-muted/70 tracking-wider">
        Local · Private data
      </p>
    </aside>
  );
}
