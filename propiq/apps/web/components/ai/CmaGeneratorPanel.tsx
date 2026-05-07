"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Sparkles } from "lucide-react";
import type { Property } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface CmaPayload {
  subject: Property;
  comparables: Property[];
  generatedAt: string;
  narrative: {
    summary: string;
    pricingRecommendation: {
      suggestedMin: number;
      suggestedMax: number;
      rationale: string;
    };
    marketContext: string;
    comparableAnalysis: Array<{ propertyId: string; insight: string }>;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function CmaGeneratorPanel() {
  const t = useTranslations("ai");
  const [properties, setProperties] = useState<Property[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [comparableIds, setComparableIds] = useState<Set<string>>(new Set());
  const [payload, setPayload] = useState<CmaPayload | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/properties", { params: { limit: 200 } })
      .then((res) => setProperties(unwrap<Property[]>(res)))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const toggleComparable = (id: string) => {
    setComparableIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 8) next.add(id);
      return next;
    });
  };

  const generate = async () => {
    if (!subjectId || comparableIds.size === 0) return;
    setGenerating(true);
    setError(null);
    setPayload(null);
    try {
      const res = await api.post("/api/ai/cma/generate", {
        subjectId,
        comparableIds: Array.from(comparableIds),
      });
      setPayload(unwrap<CmaPayload>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const download = async () => {
    if (!subjectId || comparableIds.size === 0) return;
    setDownloading(true);
    setError(null);
    try {
      const cookieMatch = document.cookie.match(
        /(?:^|; )propiq_access=([^;]+)/,
      );
      const token = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
      const res = await fetch(`${API_URL}/api/ai/cma/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subjectId,
          comparableIds: Array.from(comparableIds),
        }),
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cma-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const fmtMoney = (n: number, c = "QAR") =>
    `${c} ${n.toLocaleString()}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t("cmaHint")}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-3 space-y-2">
          <p className="label">{t("cmaSubject")}</p>
          <select
            className="input"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setComparableIds(new Set());
            }}
          >
            <option value="">{t("selectProperty")}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {p.area ? ` · ${p.area}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="card p-3 space-y-2 max-h-[260px] overflow-y-auto">
          <p className="label">{t("cmaComparables")} ({comparableIds.size}/8)</p>
          {properties
            .filter((p) => p.id !== subjectId)
            .map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={comparableIds.has(p.id)}
                  onChange={() => toggleComparable(p.id)}
                  disabled={
                    !comparableIds.has(p.id) && comparableIds.size >= 8
                  }
                />
                <span className="truncate">
                  {p.title}
                  {p.area ? ` · ${p.area}` : ""}
                  {p.price
                    ? ` · ${fmtMoney(p.price, p.currency)}`
                    : ""}
                </span>
              </label>
            ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={generate}
          disabled={!subjectId || comparableIds.size === 0 || generating}
          className="btn-primary inline-flex items-center gap-1"
        >
          {generating ? <Spinner /> : <Sparkles className="h-4 w-4" />}
          {generating ? t("generating") : payload ? t("regenerate") : t("generate")}
        </button>
        <button
          onClick={download}
          disabled={!subjectId || comparableIds.size === 0 || downloading}
          className="btn-ghost inline-flex items-center gap-1"
        >
          {downloading ? <Spinner /> : <Download className="h-4 w-4" />}
          {t("downloadPdf")}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {payload && (
        <div className="card p-5 space-y-4">
          <div>
            <p className="label">{t("pricingRecommendation")}</p>
            <p className="text-2xl font-bold text-brand-700">
              {fmtMoney(
                payload.narrative.pricingRecommendation.suggestedMin,
                payload.subject.currency,
              )}{" "}
              –{" "}
              {fmtMoney(
                payload.narrative.pricingRecommendation.suggestedMax,
                payload.subject.currency,
              )}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {payload.narrative.pricingRecommendation.rationale}
            </p>
          </div>

          <div>
            <p className="label">{t("summary")}</p>
            <p className="text-sm text-slate-700">{payload.narrative.summary}</p>
          </div>

          <div>
            <p className="label">{t("marketContext")}</p>
            <p className="text-sm text-slate-700">
              {payload.narrative.marketContext}
            </p>
          </div>

          <div>
            <p className="label">{t("compInsight")}</p>
            <ul className="space-y-2">
              {payload.narrative.comparableAnalysis.map((ca, i) => {
                const comp = payload.comparables.find(
                  (c) => c.id === ca.propertyId,
                );
                return (
                  <li key={i} className="rounded-md border border-slate-200 p-2">
                    <p className="text-xs font-medium text-slate-700">
                      {comp?.title ?? ca.propertyId}
                    </p>
                    <p className="text-sm text-slate-600">{ca.insight}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
