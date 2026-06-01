"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPrint = pathname?.includes("/print");
  const isPlanner = pathname?.startsWith("/planner");

  if (isPrint) {
    return <>{children}</>;
  }

  if (isPlanner) {
    return (
      <>
        <div className="app-shell app-main app-main--planner min-h-screen">{children}</div>
        <MobileNav />
      </>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar />
      <main className="app-main">{children}</main>
      <MobileNav />
    </div>
  );
}
