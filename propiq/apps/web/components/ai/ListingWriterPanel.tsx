"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import type { Property } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface ListingContent {
  description_en: string;
  description_ar: string;
  highlights_en: string[];
  highlights_ar: string[];
  meta_description_en: string;
  meta_description_ar: string;
}

export function ListingWriterPanel() {
  const t = useTranslations("ai");
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [content, setContent] = useState<ListingContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/properties", { params: { limit: 200 } })
      .then((res) => setProperties(unwrap<Property[]>(res)))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const generate = async () => {
    if (!propertyId) return;
    setGenerating(true);
    setError(null);
    setDone(null);
    setContent(null);
    try {
      const res = await api.post("/api/ai/listing-writer/generate", {
        propertyId,
      });
      setContent(unwrap<ListingContent>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const apply = async () => {
    if (!propertyId || !content) return;
    setApplying(true);
    setError(null);
    setDone(null);
    try {
      await api.post("/api/ai/listing-writer/apply", {
        propertyId,
        content,
      });
      setDone(t("applied"));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t("listingHint")}</p>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <select
          className="input flex-1 min-w-[260px]"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        >
          <option value="">{t("selectProperty")}</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
              {p.area ? ` · ${p.area}` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={!propertyId || generating}
          className="btn-primary inline-flex items-center gap-1"
        >
          {generating ? <Spinner /> : <Sparkles className="h-4 w-4" />}
          {generating ? t("generating") : content ? t("regenerate") : t("generate")}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {done && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {done}
        </div>
      )}

      {content && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <p className="label">{t("descriptionEn")}</p>
              <p className="whitespace-pre-wrap text-sm text-slate-800">
                {content.description_en}
              </p>
            </div>
            <div className="card p-4" dir="rtl">
              <p className="label">{t("descriptionAr")}</p>
              <p className="whitespace-pre-wrap text-sm text-slate-800">
                {content.description_ar}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <p className="label">{t("highlightsEn")}</p>
              <ul className="list-disc ms-5 text-sm text-slate-800 space-y-1">
                {content.highlights_en.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
            <div className="card p-4" dir="rtl">
              <p className="label">{t("highlightsAr")}</p>
              <ul className="list-disc ms-5 text-sm text-slate-800 space-y-1">
                {content.highlights_ar.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-3">
              <p className="label">{t("metaEn")}</p>
              <p className="text-xs text-slate-700">
                {content.meta_description_en}
              </p>
            </div>
            <div className="card p-3" dir="rtl">
              <p className="label">{t("metaAr")}</p>
              <p className="text-xs text-slate-700">
                {content.meta_description_ar}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={apply}
              disabled={applying}
              className="btn-primary"
            >
              {applying ? <Spinner /> : t("apply")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
