"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SectionIcon } from "@/components/layout/SectionIcon";
import {
  isMainNavActive,
  isMobileMoreActive,
  MAIN_NAV,
  MOBILE_MORE_LINKS,
} from "@/lib/theme/section-colors";

function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="4" cy="8" r="1.1" fill="currentColor" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" />
      <circle cx="12" cy="8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function MobileNav() {
  const pathname = usePathname() ?? "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMobileMoreActive(pathname);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.body.classList.add("mobile-more-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("mobile-more-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  return (
    <>
      <nav className="mobile-nav md:hidden" aria-label="Main navigation">
        {MAIN_NAV.map((item) => {
          const active = isMainNavActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-section={item.section}
              className={`mobile-nav-link${active ? " is-active" : ""}`}
            >
              <SectionIcon section={item.section} className="mobile-nav-icon" />
              <span className="mobile-nav-label">{item.mobileLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={`mobile-nav-link mobile-nav-more${moreActive ? " is-active" : ""}`}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          aria-controls="mobile-more-menu"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <span className="mobile-nav-icon mobile-nav-icon--more" aria-hidden>
            <MoreIcon />
          </span>
          <span className="mobile-nav-label">More</span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="mobile-more-root md:hidden">
          <button
            type="button"
            className="mobile-more-backdrop"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            id="mobile-more-menu"
            className="mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
          >
            <div className="mobile-more-head">
              <p className="mobile-more-title">More</p>
              <button
                type="button"
                className="mobile-more-close"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
              >
                ×
              </button>
            </div>
            <ul className="mobile-more-list">
              {MOBILE_MORE_LINKS.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      data-section={link.section}
                      className={`mobile-more-link${active ? " is-active" : ""}`}
                      onClick={() => setMoreOpen(false)}
                    >
                      <SectionIcon section={link.section} className="mobile-more-icon" />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
