"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  Flame,
  TrendingUp,
  Wallet,
  Building2,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { DealStage } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface DashboardStats {
  contacts: {
    total: number;
    active: number;
    dead: number;
    hot: number;
    warm: number;
    cold: number;
    salesLeads: number;
    leaseLeads: number;
  };
  properties: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
    rented: number;
  };
  deals: {
    total: number;
    open: number;
    won: number;
    lost: number;
    pipelineValue: number;
    weightedPipelineValue: number;
    expectedCommission: number;
    byStage: Record<DealStage, { count: number; value: number }>;
  };
  activities: {
    last30Days: number;
    upcoming: number;
  };
}

const STAGE_ORDER: DealStage[] = [
  "NEW_LEAD",
  "CONTACTED",
  "VIEWING_SCHEDULED",
  "VIEWED",
  "OFFER_MADE",
  "NEGOTIATING",
  "CONTRACT_SENT",
];

function fmtCurrency(n: number): string {
  if (n === 0) return "QAR 0";
  if (n >= 1_000_000) return `QAR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `QAR ${(n / 1_000).toFixed(0)}K`;
  return `QAR ${n}`;
}

export function StatsWidgets() {
  const t = useTranslations("dashboard");
  const tPipeline = useTranslations("pipeline");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/stats/dashboard")
      .then((res) => setStats(unwrap<DashboardStats>(res)))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="card p-6 text-center">
        <Spinner />
      </div>
    );
  }

  const maxStage = Math.max(
    1,
    ...STAGE_ORDER.map((s) => stats.deals.byStage[s]?.count ?? 0),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Users}
          label={t("kpiContacts")}
          value={String(stats.contacts.total)}
          hint={`${stats.contacts.salesLeads} sales · ${stats.contacts.leaseLeads} lease`}
        />
        <Kpi
          icon={Flame}
          label={t("kpiHotLeads")}
          value={String(stats.contacts.hot)}
          hint={`${stats.contacts.warm} warm · ${stats.contacts.cold} cold`}
          tone="hot"
        />
        <Kpi
          icon={TrendingUp}
          label={t("kpiPipeline")}
          value={fmtCurrency(stats.deals.pipelineValue)}
          hint={`${t("weightedPipeline")}: ${fmtCurrency(stats.deals.weightedPipelineValue)}`}
        />
        <Kpi
          icon={Wallet}
          label={t("kpiCommission")}
          value={fmtCurrency(stats.deals.expectedCommission)}
          hint={`${stats.deals.won} ${t("wonDeals").toLowerCase()}`}
          tone="won"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Building2}
          label="Properties"
          value={String(stats.properties.total)}
          hint={`${stats.properties.available} available · ${stats.properties.reserved} reserved`}
        />
        <Kpi
          icon={AlertTriangle}
          label={t("deadLeads")}
          value={String(stats.contacts.dead)}
          hint={String(stats.contacts.active) + " active"}
          tone={stats.contacts.dead > 0 ? "warn" : undefined}
        />
        <Kpi
          icon={CalendarClock}
          label={t("upcomingActivities")}
          value={String(stats.activities.upcoming)}
          hint={`${stats.activities.last30Days} ${t("last30Days").toLowerCase()}`}
        />
        <Kpi
          icon={CheckCircle2}
          label={t("openDeals")}
          value={String(stats.deals.open)}
          hint={`${stats.deals.lost} ${t("lostDeals").toLowerCase()}`}
        />
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800">
          {t("stageBreakdown")}
        </h2>
        <div className="mt-3 space-y-2">
          {STAGE_ORDER.map((stage) => {
            const data = stats.deals.byStage[stage] ?? { count: 0, value: 0 };
            const pct = (data.count / maxStage) * 100;
            return (
              <div
                key={stage}
                className="flex items-center gap-2 sm:gap-3 text-xs"
              >
                <span className="w-20 sm:w-36 shrink-0 text-slate-600 truncate">
                  {tPipeline(`stage_${stage}`)}
                </span>
                <div className="flex-1 min-w-[40px] h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 sm:w-10 text-end font-medium text-slate-700">
                  {data.count}
                </span>
                <span className="hidden sm:inline-block w-24 text-end text-slate-500">
                  {data.value > 0 ? fmtCurrency(data.value) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  tone?: "hot" | "warn" | "won";
}) {
  const toneCls =
    tone === "hot"
      ? "text-rose-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "won"
          ? "text-emerald-600"
          : "text-brand-700";
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${toneCls}`} />
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
