export type AdminSection =
  | "dashboard"
  | "calendar"
  | "planner"
  | "clients"
  | "library"
  | "payments"
  | "transport"
  | "accommodation"
  | "concierge-services"
  | "reports"
  | "settings";

export const SECTION_COLORS: Record<AdminSection, string> = {
  dashboard: "#B89B6A",
  calendar: "#3E6FA8",
  planner: "#B89B6A",
  clients: "#4F8A63",
  library: "#7556A8",
  payments: "#C9822B",
  transport: "#3B92C8",
  accommodation: "#4E9B91",
  "concierge-services": "#9B4F5C",
  reports: "#7C7C7C",
  settings: "#A8A8A8",
};

export interface NavItem {
  href: string;
  label: string;
  short: string;
  mobileLabel: string;
  section: AdminSection;
}

export interface MobileMoreLink {
  href: string;
  label: string;
  section: AdminSection;
}

export const MAIN_NAV: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    short: "Home",
    mobileLabel: "Home",
    section: "dashboard",
  },
  {
    href: "/calendar",
    label: "Calendar",
    short: "Cal",
    mobileLabel: "Calendar",
    section: "calendar",
  },
  {
    href: "/planner",
    label: "Weekly Planner",
    short: "Plans",
    mobileLabel: "Plans",
    section: "planner",
  },
  {
    href: "/clients",
    label: "Clients",
    short: "Clients",
    mobileLabel: "Clients",
    section: "clients",
  },
  {
    href: "/establishments",
    label: "Library",
    short: "Library",
    mobileLabel: "Library",
    section: "library",
  },
];

/** Secondary routes reachable from desktop UI but not in the bottom bar. */
export const MOBILE_MORE_LINKS: MobileMoreLink[] = [
  { href: "/events", label: "Events", section: "library" },
  { href: "/event-venues", label: "Event Venues", section: "library" },
  { href: "/establishments/import", label: "Import establishments", section: "library" },
  { href: "/planner/new", label: "New weekly planner", section: "planner" },
  { href: "/clients/new", label: "New client", section: "clients" },
  { href: "/establishments/new", label: "New establishment", section: "library" },
];

export function resolveSectionFromPath(pathname: string): AdminSection {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/planner")) return "planner";
  if (pathname.startsWith("/clients")) return "clients";
  if (
    pathname.startsWith("/establishments") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/event-venues")
  ) {
    return "library";
  }
  return "dashboard";
}

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname.startsWith(href);
}

export function isMainNavActive(pathname: string, item: NavItem): boolean {
  if (item.section === "library") {
    return resolveSectionFromPath(pathname) === "library";
  }
  return isNavActive(pathname, item.href);
}

export function isMobileMoreActive(pathname: string): boolean {
  return MOBILE_MORE_LINKS.some((link) =>
    link.href === "/"
      ? pathname === "/"
      : pathname.startsWith(link.href)
  );
}
