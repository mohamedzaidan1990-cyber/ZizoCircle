"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { cn } from "@/lib/utils";

export type Tier = "hot" | "warm" | "cold" | "dead";

export type PropifyStatus = "NEW" | "ARCHIVED";

export interface Lead {
  id: string;
  phone: string;
  source: string | null;
  ai_score: number | null;
  ai_score_reason: string | null;
  ai_tier: Tier | null;
  ai_qualifiers: Record<string, boolean> | null;
  conversation_summary: string | null;
  propify_status: PropifyStatus;
  property_ref: string | null;
  property_name: string | null;
  assigned_to: string | null;
  created_at: string;
}

const STAGE_ORDER: Tier[] = ["hot", "warm", "cold", "dead"];

export function LeadsBoard({
  leads: initialLeads,
  locale,
}: {
  leads: Lead[];
  locale: string;
}) {
  const t = useTranslations("leads");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  // Keep local state in sync if the server-rendered page passes new data.
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const updateTier = async (id: string, nextTier: Tier): Promise<string | null> => {
    const before = leads;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              ai_tier: nextTier,
              propify_status: nextTier === "dead" ? "ARCHIVED" : l.propify_status,
            }
          : l,
      ),
    );
    try {
      const res = await api.patch(`/api/propify/leads/${id}`, { ai_tier: nextTier });
      unwrap(res);
      return null;
    } catch (err) {
      // Roll back optimistic update on failure.
      setLeads(before);
      return getErrorMessage(err);
    }
  };

  if (leads.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-slate-500">
        {t("empty")}
      </div>
    );
  }

  const grouped = STAGE_ORDER.reduce<Record<Tier, Lead[]>>(
    (acc, tier) => {
      acc[tier] = leads.filter((l) => l.ai_tier === tier);
      return acc;
    },
    { hot: [], warm: [], cold: [], dead: [] },
  );

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
              <LeadCard
                key={lead.id}
                lead={lead}
                tier={tier}
                locale={locale}
                onTierChange={updateTier}
              />
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
  onTierChange,
}: {
  lead: Lead;
  tier: Tier;
  locale: string;
  onTierChange: (id: string, tier: Tier) => Promise<string | null>;
}) {
  const t = useTranslations("leads");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const masked = maskPhone(lead.phone);
  const reasonDetail = lead.ai_score_reason?.replace(/^\[.*?\]\s*/, "") ?? "";
  const created = new Date(lead.created_at).toLocaleString(
    locale === "ar" ? "ar-QA" : "en-US",
    { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" },
  );

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Tier;
    if (next === tier) return;
    setPending(true);
    setError(null);
    const err = await onTierChange(lead.id, next);
    setPending(false);
    if (err) setError(err);
  };

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
        <div
          className={cn(
            "rounded-md px-2 py-0.5 text-lg font-bold tabular-nums",
            tierTextClass(tier),
          )}
          aria-label="lead score"
        >
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
            lead.propify_status === "NEW"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {lead.propify_status}
        </span>

        <label className="flex items-center gap-1 text-xs text-slate-500">
          <span className="sr-only">{t("changeTier")}</span>
          <select
            value={tier}
            onChange={handleChange}
            disabled={pending}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs disabled:opacity-50"
          >
            <option value="hot">{t("tier_hot").toUpperCase()}</option>
            <option value="warm">{t("tier_warm").toUpperCase()}</option>
            <option value="cold">{t("tier_cold").toUpperCase()}</option>
            <option value="dead">{t("tier_dead").toUpperCase()}</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
          {error}
        </div>
      )}
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
      return "bg-red-50 text-red-700";
    case "warm":
      return "bg-amber-50 text-amber-700";
    case "cold":
      return "bg-blue-50 text-blue-700";
    case "dead":
      return "bg-slate-100 text-slate-500";
  }
}
