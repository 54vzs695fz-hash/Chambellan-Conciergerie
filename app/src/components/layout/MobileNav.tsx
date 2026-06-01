"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SectionIcon } from "@/components/layout/SectionIcon";
import {
  isNavActive,
  MAIN_NAV,
} from "@/lib/theme/section-colors";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav md:hidden" aria-label="Main navigation">
      {MAIN_NAV.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-section={item.section}
            className={`mobile-nav-link${active ? " is-active" : ""}`}
          >
            <SectionIcon section={item.section} className="mobile-nav-icon" />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
