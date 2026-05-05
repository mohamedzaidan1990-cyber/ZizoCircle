"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Users, Globe, Bell } from "lucide-react";
import { ProfilePanel } from "./ProfilePanel";
import { TeamPanel } from "./TeamPanel";
import { PortalsPanel } from "./PortalsPanel";
import { NotificationsPanel } from "./NotificationsPanel";

type Tab = "profile" | "team" | "portals" | "notifications";

export function SettingsTabs() {
  const t = useTranslations("settings");
  const [tab, setTab] = useState<Tab>("profile");
  const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "profile", label: t("tab_profile"), icon: Building2 },
    { id: "team", label: t("tab_team"), icon: Users },
    { id: "portals", label: t("tab_portals"), icon: Globe },
    { id: "notifications", label: t("tab_notifications"), icon: Bell },
  ];
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-1 p-1 overflow-x-auto">
        {TABS.map((tb) => {
          const Icon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                tab === tb.id
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tb.label}
            </button>
          );
        })}
      </div>
      {tab === "profile" && <ProfilePanel />}
      {tab === "team" && <TeamPanel />}
      {tab === "portals" && <PortalsPanel />}
      {tab === "notifications" && <NotificationsPanel />}
    </div>
  );
}
