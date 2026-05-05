"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  Target,
  FileText,
  MessageSquare,
  Workflow,
} from "lucide-react";
import { ListingWriterPanel } from "./ListingWriterPanel";
import { LeadScorerPanel } from "./LeadScorerPanel";
import { CmaGeneratorPanel } from "./CmaGeneratorPanel";
import { NegotiationCoachPanel } from "./NegotiationCoachPanel";
import { SequenceBuilder } from "@/components/sequences/SequenceBuilder";

type Tab = "listing" | "scorer" | "cma" | "coach" | "sequences";

export function AiToolsTabs() {
  const t = useTranslations("ai");
  const [tab, setTab] = useState<Tab>("listing");

  const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
    { id: "listing", label: t("tab_listing"), icon: Sparkles },
    { id: "scorer", label: t("tab_scorer"), icon: Target },
    { id: "cma", label: t("tab_cma"), icon: FileText },
    { id: "coach", label: t("tab_coach"), icon: MessageSquare },
    { id: "sequences", label: t("tab_sequences"), icon: Workflow },
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

      {tab === "listing" && <ListingWriterPanel />}
      {tab === "scorer" && <LeadScorerPanel />}
      {tab === "cma" && <CmaGeneratorPanel />}
      {tab === "coach" && <NegotiationCoachPanel />}
      {tab === "sequences" && <SequenceBuilder />}
    </div>
  );
}
