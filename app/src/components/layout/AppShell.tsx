"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { resolveSectionFromPath } from "@/lib/theme/section-colors";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const section = resolveSectionFromPath(pathname);
  const isPrint = pathname.includes("/print");
  const isPlanner = pathname.startsWith("/planner");

  if (isPrint) {
    return <>{children}</>;
  }

  if (isPlanner) {
    return (
      <>
        <div
          className="app-shell app-main app-main--planner min-h-screen"
          data-section={section}
        >
          {children}
        </div>
        <MobileNav />
      </>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar />
      <main className="app-main" data-section={section}>
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
