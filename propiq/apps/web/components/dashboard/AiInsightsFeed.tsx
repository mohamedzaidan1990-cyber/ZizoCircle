"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, RefreshCw, AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface Insight {
  id: string;
  type: "OPPORTUNITY" | "RISK" | "RECOMMENDATION";
  title: string;
  body: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

const TYPE_ICON = {
  OPPORTUNITY: TrendingUp,
  RISK: AlertTriangle,
  RECOMMENDATION: Lightbulb,
};

const PRIORITY_BADGE: Record<Insight["priority"], string> = {
  HIGH: "bg-rose-100 text-rose-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-slate-100 text-slate-600",
};

export function AiInsightsFeed() {
  const t = useTranslations("dashboard");
  const [items, setItems] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/ai/insights");
      setItems(unwrap<Insight[]>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Sparkles className="h-4 w-4 text-brand-700" />
          {t("aiInsights")}
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="btn-ghost inline-flex items-center gap-1 text-xs"
        >
          {loading ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />}
          {t("refresh")}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && items === null && (
        <p className="text-sm text-slate-500">{t("generating")}</p>
      )}

      {items === null && !loading && !error && (
        <p className="text-sm text-slate-500">{t("insightsEmpty")}</p>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((it) => {
            const Icon = TYPE_ICON[it.type] ?? Lightbulb;
            return (
              <li
                key={it.id}
                className="rounded-md border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5">
                    <Icon className="h-4 w-4 text-brand-700 mt-0.5" />
                    <p className="text-sm font-semibold text-slate-900">
                      {it.title}
                    </p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${PRIORITY_BADGE[it.priority]}`}
                  >
                    {it.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{it.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      {items && items.length === 0 && !loading && (
        <p className="text-sm text-slate-500">{t("insightsEmpty")}</p>
      )}
    </div>
  );
}
