"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SectionIcon } from "@/components/layout/SectionIcon";
import {
  isNavActive,
  MAIN_NAV,
} from "@/lib/theme/section-colors";

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
        {MAIN_NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-section={item.section}
              className={`app-sidebar-link${active ? " is-active" : ""}`}
            >
              <SectionIcon section={item.section} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="app-sidebar-foot">Local · Private data</p>
    </aside>
  );
}
