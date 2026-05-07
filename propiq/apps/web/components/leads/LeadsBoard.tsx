"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type Tier = "hot" | "warm" | "cold" | "dead";

export interface Lead {
  id: string;
  phone: string;
  source: string | null;
  ai_score: number | null;
  ai_score_reason: string | null;
  ai_tier: Tier | null;
  ai_qualifiers: Record<string, boolean> | null;
  conversation_summary: string | null;
  status: string;
  property_ref: string | null;
  property_name: string | null;
  assigned_to: string | null;
  created_at: string;
}

const STAGE_ORDER: Tier[] = ["hot", "warm", "cold", "dead"];

export function LeadsBoard({ leads, locale }: { leads: Lead[]; locale: string }) {
  const t = useTranslations("leads");

  if (leads.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-slate-500">
        {t("empty")}
      </div>
    );
  }

  const grouped = STAGE_ORDER.reduce<Record<Tier, Lead[]>>((acc, tier) => {
    acc[tier] = leads.filter((l) => l.ai_tier === tier);
    return acc;
  }, { hot: [], warm: [], cold: [], dead: [] });

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {STAGE_ORDER.map((tier) => (
        <div key={tier} className="space-y-3">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-semibold",
                tierBadgeClass(tier),
              )}
            >
              {t(`tier_${tier}` as const).toUpperCase()}
            </span>
            <span className="text-xs text-slate-500">
              {grouped[tier].length}
            </span>
          </div>
          {grouped[tier].length === 0 ? (
            <div className="card p-4 text-center text-xs text-slate-400">
              —
            </div>
          ) : (
            grouped[tier].map((lead) => (
              <LeadCard key={lead.id} lead={lead} tier={tier} locale={locale} />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function LeadCard({
  lead,
  tier,
  locale,
}: {
  lead: Lead;
  tier: Tier;
  locale: string;
}) {
  const masked = maskPhone(lead.phone);
  const reasonDetail = lead.ai_score_reason?.replace(/^\[.*?\]\s*/, "") ?? "";
  const created = new Date(lead.created_at).toLocaleString(
    locale === "ar" ? "ar-QA" : "en-US",
    { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" },
  );

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">
            {masked}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 truncate">
            {(lead.source ?? "").replace(/_/g, " ")} · {created}
          </div>
        </div>
        <div className={cn("text-lg font-bold tabular-nums", tierTextClass(tier))}>
          {lead.ai_score ?? 0}
        </div>
      </div>

      {lead.property_name || lead.property_ref ? (
        <div className="text-xs text-slate-700 truncate">
          {lead.property_name ?? lead.property_ref}
        </div>
      ) : null}

      {reasonDetail && (
        <div className="text-xs text-slate-500 line-clamp-2">{reasonDetail}</div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex rounded px-2 py-0.5 text-xs font-medium",
            lead.status === "NEW"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {lead.status}
        </span>
      </div>
    </div>
  );
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, Math.min(4, phone.length - 4))}••••${phone.slice(-2)}`;
}

function tierBadgeClass(tier: Tier): string {
  switch (tier) {
    case "hot":
      return "border-red-300 bg-red-50 text-red-700";
    case "warm":
      return "border-amber-300 bg-amber-50 text-amber-700";
    case "cold":
      return "border-blue-300 bg-blue-50 text-blue-700";
    case "dead":
      return "border-slate-300 bg-slate-100 text-slate-600";
  }
}

function tierTextClass(tier: Tier): string {
  switch (tier) {
    case "hot":
      return "text-red-600";
    case "warm":
      return "text-amber-600";
    case "cold":
      return "text-blue-600";
    case "dead":
      return "text-slate-500";
  }
}
