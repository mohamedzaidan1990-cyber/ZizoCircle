"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DealStage } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

type Range = "this_month" | "last_3_months" | "last_12_months" | "all_time";

const RANGES: Range[] = [
  "this_month",
  "last_3_months",
  "last_12_months",
  "all_time",
];

interface FunnelRow {
  stage: DealStage;
  count: number;
  conversion: number;
  dropoff: number;
}
interface AgentRevenueRow {
  agentId: string;
  agentName: string;
  thisMonth: number;
  lastMonth: number;
}
interface LeadSourceRow {
  source: string;
  count: number;
}
interface MonthlyVolumeRow {
  month: string;
  closedWon: number;
  closedLost: number;
}
interface AvgDaysRow {
  stage: DealStage;
  avgDays: number;
  sample: number;
}

const PIE_COLORS = [
  "#0F766E", // teal (brand)
  "#3B82F6", // blue
  "#A855F7", // purple
  "#F59E0B", // amber
  "#EF4444", // red
  "#22C55E", // green
  "#64748B", // slate
];

function fmtMoney(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function ReportsDashboard() {
  const t = useTranslations("reports");
  const [range, setRange] = useState<Range>("last_3_months");
  const [funnel, setFunnel] = useState<FunnelRow[] | null>(null);
  const [revenue, setRevenue] = useState<AgentRevenueRow[] | null>(null);
  const [sources, setSources] = useState<LeadSourceRow[] | null>(null);
  const [volume, setVolume] = useState<MonthlyVolumeRow[] | null>(null);
  const [avgDays, setAvgDays] = useState<AvgDaysRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFunnel(null);
    setSources(null);
    setAvgDays(null);
    setError(null);

    const params = { range };
    Promise.all([
      api.get("/api/reports/funnel", { params }),
      api.get("/api/reports/leads-by-source", { params }),
      api.get("/api/reports/avg-days-per-stage", { params }),
    ])
      .then(([f, s, a]) => {
        setFunnel(unwrap<FunnelRow[]>(f));
        setSources(unwrap<LeadSourceRow[]>(s));
        setAvgDays(unwrap<AvgDaysRow[]>(a));
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [range]);

  // Revenue + monthly volume don't depend on the range filter.
  useEffect(() => {
    Promise.all([
      api.get("/api/reports/revenue-by-agent"),
      api.get("/api/reports/monthly-deal-volume"),
    ])
      .then(([r, v]) => {
        setRevenue(unwrap<AgentRevenueRow[]>(r));
        setVolume(unwrap<MonthlyVolumeRow[]>(v));
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const funnelData = funnel?.map((f) => ({
    stage: t(`stage_${f.stage}`),
    count: f.count,
    conversion: f.conversion,
    dropoff: f.dropoff,
  }));
  const revenueData = revenue?.map((r) => ({
    name: r.agentName,
    thisMonth: r.thisMonth,
    lastMonth: r.lastMonth,
  }));
  const volumeData = volume?.map((m) => ({
    month: m.month.slice(5), // "YYYY-MM" -> "MM"
    won: m.closedWon,
    lost: m.closedLost,
  }));
  const avgData = avgDays?.map((a) => ({
    stage: t(`stage_${a.stage}`),
    avgDays: a.avgDays,
    sample: a.sample,
  }));

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <label className="text-sm font-medium text-slate-700">
          {t("range")}
        </label>
        <select
          className="input w-auto"
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
        >
          {RANGES.map((r) => (
            <option key={r} value={r}>
              {t(`range_${r}`)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("funnelTitle")} hint={t("funnelHint")}>
          {funnelData ? (
            funnelData.every((d) => d.count === 0) ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis dataKey="stage" type="category" stroke="#64748b" width={120} fontSize={12} />
                  <Tooltip
                    formatter={(v, k) => {
                      const num = Number(v);
                      const key = String(k);
                      return key === "count"
                        ? [num, t("deals")]
                        : [`${num}%`, t(key)];
                    }}
                  />
                  <Bar dataKey="count" fill="#0F766E" name={t("deals")} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            <Loading />
          )}
          {funnelData && funnelData.length > 1 && (
            <div className="mt-2 space-y-1 text-xs text-slate-500">
              {funnelData.slice(1).map((row, idx) => (
                <div key={row.stage} className="flex justify-between">
                  <span>
                    {funnelData[idx].stage} → {row.stage}
                  </span>
                  <span className={row.dropoff > 50 ? "text-rose-600" : ""}>
                    −{row.dropoff}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title={t("revenueTitle")} hint={t("revenueHint")}>
          {revenueData ? (
            revenueData.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueData} margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => fmtMoney(Number(v))} />
                  <Tooltip formatter={(v) => `QAR ${Number(v).toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="lastMonth" fill="#94A3B8" name={t("lastMonth")} />
                  <Bar dataKey="thisMonth" fill="#0F766E" name={t("thisMonth")} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            <Loading />
          )}
        </ChartCard>

        <ChartCard title={t("leadsTitle")} hint={t("leadsHint")}>
          {sources ? (
            sources.every((s) => s.count === 0) ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={sources.filter((s) => s.count > 0)}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => {
                      const e = entry as unknown as { source?: string; count?: number };
                      return `${e.source ?? ""}: ${e.count ?? 0}`;
                    }}
                  >
                    {sources.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )
          ) : (
            <Loading />
          )}
        </ChartCard>

        <ChartCard title={t("volumeTitle")} hint={t("volumeHint")}>
          {volumeData ? (
            volumeData.every((d) => d.won === 0 && d.lost === 0) ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={volumeData} margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="won"
                    stroke="#10B981"
                    strokeWidth={2}
                    name={t("won")}
                  />
                  <Line
                    type="monotone"
                    dataKey="lost"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name={t("lost")}
                  />
                </LineChart>
              </ResponsiveContainer>
            )
          ) : (
            <Loading />
          )}
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title={t("avgDaysTitle")} hint={t("avgDaysHint")}>
            {avgData ? (
              avgData.every((a) => a.sample === 0) ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={avgData} layout="vertical" margin={{ left: 10, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(v) => `${v}d`}
                    />
                    <YAxis
                      dataKey="stage"
                      type="category"
                      stroke="#64748b"
                      width={130}
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={(v, _k, p) => {
                        const sample = (p?.payload as { sample?: number } | undefined)?.sample ?? 0;
                        return [
                          `${Number(v)} ${t("days")}`,
                          t("samplesShort", { n: sample }),
                        ];
                      }}
                    />
                    <Bar dataKey="avgDays" fill="#3B82F6" name={t("days")} />
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : (
              <Loading />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4 space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div>{children}</div>
    </div>
  );
}

function Loading() {
  return (
    <div className="h-[280px] flex items-center justify-center">
      <Spinner />
    </div>
  );
}

function Empty() {
  const t = useTranslations("reports");
  return (
    <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">
      {t("noData")}
    </div>
  );
}
