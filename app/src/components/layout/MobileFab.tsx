"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { MobileQuickAddKind } from "@/lib/mobile/planner-quick-add";
import { PLANNER_QUICK_ADD_EVENT } from "@/lib/mobile/planner-quick-add";
import type { Trip } from "@/lib/types";

interface FabAction {
  id: string;
  label: string;
  href?: string;
  quickAdd?: MobileQuickAddKind;
  section?: string;
}

const FAB_ACTIONS: FabAction[] = [
  { id: "planner", label: "New Planner", href: "/planner/new", section: "planner" },
  { id: "client", label: "New Client", href: "/clients/new", section: "clients" },
  {
    id: "reservation",
    label: "New Reservation",
    quickAdd: "reservation",
    section: "planner",
  },
  {
    id: "transfer",
    label: "New Transfer",
    quickAdd: "transfer",
    section: "planner",
  },
  { id: "note", label: "New Note", quickAdd: "note", section: "planner" },
];

function PlusIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden
      className={open ? "mobile-fab-plus mobile-fab-plus--open" : "mobile-fab-plus"}
    >
      <path
        d="M11 4.5v13M4.5 11h13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

async function resolvePlannerTarget(): Promise<number | "new"> {
  const res = await fetch("/api/trips");
  if (!res.ok) return "new";
  const trips = (await res.json()) as Trip[];
  const active = trips.find((trip) => trip.follow_up_status !== "completed");
  return active?.id ?? "new";
}

export function MobileFab() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isHiddenRoute =
    pathname === "/login" || pathname.includes("/print");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.classList.add("mobile-fab-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("mobile-fab-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const dispatchQuickAdd = useCallback(
    (kind: MobileQuickAddKind) => {
      window.dispatchEvent(
        new CustomEvent(PLANNER_QUICK_ADD_EVENT, { detail: { kind } })
      );
    },
    []
  );

  const handleQuickAdd = useCallback(
    async (kind: MobileQuickAddKind) => {
      setBusy(true);
      try {
        const plannerMatch = pathname.match(/^\/planner\/(\d+)/);
        if (plannerMatch) {
          dispatchQuickAdd(kind);
          setOpen(false);
          return;
        }

        const target = await resolvePlannerTarget();
        const query = `quickAdd=${kind}`;
        if (target === "new") {
          router.push(`/planner/new?${query}`);
        } else {
          router.push(`/planner/${target}?${query}`);
        }
        setOpen(false);
      } finally {
        setBusy(false);
      }
    },
    [dispatchQuickAdd, pathname, router]
  );

  if (isHiddenRoute) return null;

  const isPlannerRoute = pathname.startsWith("/planner/");

  return (
    <div
      className={`mobile-fab-root md:hidden${isPlannerRoute ? " mobile-fab-root--planner" : ""}`}
    >
      {open ? (
        <button
          type="button"
          className="mobile-fab-backdrop"
          aria-label="Close quick actions"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        className={`mobile-fab-stack${open ? " mobile-fab-stack--open" : ""}`}
        aria-hidden={!open}
      >
        <ul className="mobile-fab-menu" role="menu">
          {FAB_ACTIONS.map((action, index) => (
            <li
              key={action.id}
              className="mobile-fab-menu-item"
              style={{ "--fab-index": index } as React.CSSProperties}
              role="none"
            >
              {action.href ? (
                <Link
                  href={action.href}
                  role="menuitem"
                  data-section={action.section}
                  className="mobile-fab-action"
                  onClick={() => setOpen(false)}
                >
                  <span className="mobile-fab-action-label">{action.label}</span>
                  <span className="mobile-fab-action-dot" aria-hidden />
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  data-section={action.section}
                  className="mobile-fab-action"
                  disabled={busy}
                  onClick={() => {
                    if (action.quickAdd) void handleQuickAdd(action.quickAdd);
                  }}
                >
                  <span className="mobile-fab-action-label">{action.label}</span>
                  <span className="mobile-fab-action-dot" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className={`mobile-fab-trigger${open ? " is-open" : ""}`}
        aria-label={open ? "Close quick actions" : "Quick actions"}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <PlusIcon open={open} />
      </button>
    </div>
  );
}
