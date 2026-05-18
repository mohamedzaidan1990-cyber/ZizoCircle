"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface ParamRow {
  key: string;
  value: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewCampaignDialog({ open, onClose, onCreated }: Props) {
  const t = useTranslations("campaigns");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLang, setTemplateLang] = useState("en");
  const [params, setParams] = useState<ParamRow[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    totalRecipients: number;
    optedOut: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setTemplateName("");
    setTemplateLang("en");
    setParams([]);
    setScheduleEnabled(false);
    setScheduledAt("");
    setFile(null);
    setError(null);
    setResult(null);
  }, [open]);

  if (!open) return null;

  const addParam = () =>
    setParams((p) => [...p, { key: String(p.length + 1), value: "" }]);

  const updateParam = (idx: number, patch: Partial<ParamRow>) =>
    setParams((p) =>
      p.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );

  const removeParam = (idx: number) =>
    setParams((p) => p.filter((_, i) => i !== idx));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError(t("errorNoCsv"));
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("template_name", templateName.trim());
      fd.append("template_lang", templateLang);
      if (params.length > 0) {
        fd.append("template_params", JSON.stringify(params));
      }
      if (scheduleEnabled && scheduledAt) {
        // Convert local datetime to ISO
        fd.append("scheduled_at", new Date(scheduledAt).toISOString());
      }
      fd.append("recipients_csv", file);

      const res = await api.post("/api/propify/campaigns", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data?.data as {
        campaignId: string;
        totalRecipients: number;
        optedOut: number;
        queued: boolean;
      };
      setResult({
        totalRecipients: data.totalRecipients,
        optedOut: data.optedOut,
      });
      // Give the user a moment to see the result, then close.
      setTimeout(() => onCreated(), 1200);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
      <form
        onSubmit={onSubmit}
        className="card w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 space-y-4"
      >
        <h2 className="text-lg font-semibold">{t("newCampaign")}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cmp-name">
              {t("fieldName")}
            </label>
            <input
              id="cmp-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              required
              placeholder="Eid promo — Lusail buyers"
            />
          </div>

          <div>
            <label className="label" htmlFor="cmp-template">
              {t("fieldTemplate")}
            </label>
            <input
              id="cmp-template"
              className="input font-mono text-sm"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              maxLength={255}
              required
              placeholder="property_promo_v3"
            />
            <p className="mt-1 text-xs text-slate-500">{t("templateHint")}</p>
          </div>

          <div>
            <label className="label" htmlFor="cmp-lang">
              {t("fieldLang")}
            </label>
            <select
              id="cmp-lang"
              className="input"
              value={templateLang}
              onChange={(e) => setTemplateLang(e.target.value)}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label">{t("fieldParams")}</label>
            <button
              type="button"
              onClick={addParam}
              className="btn-ghost inline-flex items-center gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("addParam")}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">{t("paramsHint")}</p>
          {params.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">{t("noParams")}</p>
          ) : (
            <div className="mt-2 space-y-2">
              {params.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    &#123;&#123;
                  </span>
                  <input
                    className="input w-12 text-center"
                    value={p.key}
                    onChange={(e) => updateParam(idx, { key: e.target.value })}
                    pattern="\d+"
                  />
                  <span className="text-xs text-slate-500">&#125;&#125; =</span>
                  <input
                    className="input flex-1"
                    placeholder={t("paramValuePlaceholder")}
                    value={p.value}
                    onChange={(e) => updateParam(idx, { value: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeParam(idx)}
                    className="btn-ghost p-1.5"
                    aria-label="remove parameter"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="cmp-csv">
            {t("fieldCsv")}
          </label>
          <input
            id="cmp-csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-700 file:me-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-700 file:font-medium hover:file:bg-brand-100"
            required
          />
          <p className="mt-1 text-xs text-slate-500">{t("csvHint")}</p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
            />
            {t("scheduleToggle")}
          </label>
          {scheduleEnabled && (
            <input
              type="datetime-local"
              className="input mt-2"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {t("createdSummary", {
              recipients: result.totalRecipients,
              optedOut: result.optedOut,
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-ghost"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            {submitting ? <Spinner /> : null}
            {scheduleEnabled ? t("actionSchedule") : t("actionCreate")}
          </button>
        </div>
      </form>
    </div>
  );
}
