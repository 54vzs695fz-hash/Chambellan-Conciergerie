"use client";

import { useState } from "react";
import { ClientBusinessTab } from "@/components/crm/ClientBusinessTab";
import { ClientStayHistorySection } from "@/components/crm/ClientStayHistorySection";
import type { ClientBusinessStay, ClientStayHistoryItem } from "@/lib/types";

type TabId = "profile" | "business";

interface Props {
  stayHistory: ClientStayHistoryItem[];
  businessStays: ClientBusinessStay[];
  profileContent: React.ReactNode;
}

export function ClientProfileTabs({
  stayHistory,
  businessStays,
  profileContent,
}: Props) {
  const [tab, setTab] = useState<TabId>("profile");

  return (
    <div className="client-profile-tabs">
      <div className="client-profile-tab-bar" role="tablist" aria-label="Client sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "profile"}
          className={
            tab === "profile"
              ? "client-profile-tab client-profile-tab--active"
              : "client-profile-tab"
          }
          onClick={() => setTab("profile")}
        >
          Profile
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "business"}
          className={
            tab === "business"
              ? "client-profile-tab client-profile-tab--active"
              : "client-profile-tab"
          }
          onClick={() => setTab("business")}
        >
          Business
          <span className="client-profile-tab-badge">Internal</span>
        </button>
      </div>

      {tab === "profile" ? (
        <div role="tabpanel">
          {profileContent}
          <ClientStayHistorySection initialHistory={stayHistory} />
        </div>
      ) : (
        <div role="tabpanel">
          <ClientBusinessTab initialStays={businessStays} />
        </div>
      )}
    </div>
  );
}
