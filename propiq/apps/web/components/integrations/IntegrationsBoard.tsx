"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Send, Trash2, Plug, CircleCheck, CircleAlert } from "lucide-react";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { AddWebhookDialog } from "./AddWebhookDialog";
import type { WebhookSummary } from "@/app/[locale]/(dashboard)/integrations/page";

const CRM_CARDS = [
  {
    id: "hubspot",
    name: "HubSpot",
    color: "border-orange-200 bg-orange-50",
    descKey: "crmHubspot",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    color: "border-sky-200 bg-sky-50",
    descKey: "crmSalesforce",
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    color: "border-rose-200 bg-rose-50",
    descKey: "crmZoho",
  },
  {
    id: "zapier",
    name: "Zapier / Make",
    color: "border-amber-200 bg-amber-50",
    descKey: "crmZapier",
  },
] as const;

export function IntegrationsBoard({
  initial,
  locale,
}: {
  initial: WebhookSummary[];
  locale: string;
}) {
  const t = useTranslations("integrations");
  const [webhooks, setWebhooks] = useState<WebhookSummary[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    status: number | null;
  } | null>(null);

  const refresh = async () => {
    try {
      const res = await api.get("/api/propify/webhooks");
      setWebhooks(unwrap<WebhookSummary[]>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    setBusy(id);
    setError(null);
    try {
      await api.delete(`/api/propify/webhooks/${id}`);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const onTest = async (id: string) => {
    setBusy(id);
    setError(null);
    setTestResult(null);
    try {
      const res = await api.post(`/api/propify/webhooks/${id}/test`);
      const data = unwrap<{ status: number | null }>(res);
      setTestResult({ id, status: data.status });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers / non-secure contexts: nothing to do.
    }
  };

  return (
    <div className="space-y-8">
      {/* Webhooks section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {t("webhooksTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("webhooksSubtitle")}
            </p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="btn-primary inline-flex items-center gap-1.5 text-sm"
          >
            <Plus className="h-4 w-4" />
            {t("addWebhook")}
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {webhooks.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
            <Plug className="h-8 w-8 text-slate-300" />
            <div className="text-sm text-slate-600">{t("emptyWebhooks")}</div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 text-start font-medium">
                      {t("colName")}
                    </th>
                    <th className="px-4 py-2 text-start font-medium">
                      {t("colUrl")}
                    </th>
                    <th className="px-4 py-2 text-start font-medium">
                      {t("colEvents")}
                    </th>
                    <th className="px-4 py-2 text-start font-medium">
                      {t("colLastFired")}
                    </th>
                    <th className="px-4 py-2 text-start font-medium">
                      {t("colLastStatus")}
                    </th>
                    <th className="px-4 py-2 text-end font-medium">
                      {t("colActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((w) => {
                    const isBusy = busy === w.id;
                    const dateFmt = new Intl.DateTimeFormat(
                      locale === "ar" ? "ar-QA" : "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    );
                    return (
                      <tr
                        key={w.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-2 font-medium text-slate-800">
                          {w.name}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => copyUrl(w.url)}
                            title={w.url}
                            className="font-mono text-xs text-slate-600 hover:text-brand-700 truncate max-w-[260px] block text-start"
                          >
                            {w.url}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-700">
                          {w.events.map((e) => (
                            <span
                              key={e}
                              className="me-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5"
                            >
                              {e}
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {w.lastFiredAt
                            ? dateFmt.format(new Date(w.lastFiredAt))
                            : "—"}
                        </td>
                        <td className="px-4 py-2">
                          {w.lastStatus == null ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : w.lastStatus >= 200 && w.lastStatus < 300 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                              <CircleCheck className="h-3.5 w-3.5" />
                              {w.lastStatus}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-700">
                              <CircleAlert className="h-3.5 w-3.5" />
                              {w.lastStatus === 0 ? t("statusNetwork") : w.lastStatus}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-end">
                          <div className="inline-flex items-center gap-1">
                            {isBusy ? (
                              <Spinner />
                            ) : (
                              <>
                                <button
                                  onClick={() => onTest(w.id)}
                                  className="btn-ghost inline-flex items-center gap-1 text-xs text-brand-700"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  {t("actionTest")}
                                </button>
                                <button
                                  onClick={() => onDelete(w.id)}
                                  className="btn-ghost inline-flex items-center gap-1 text-xs text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {testResult && (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {t("testResult", {
              status: testResult.status ?? t("statusNetwork"),
            })}
          </div>
        )}
      </section>

      {/* CRM quickstart cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            {t("quickstartTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("quickstartSubtitle")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CRM_CARDS.map((crm) => (
            <div
              key={crm.id}
              className={`card border ${crm.color} p-4 space-y-2`}
            >
              <div className="text-sm font-semibold text-slate-900">
                {crm.name}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {t(crm.descKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <AddWebhookDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setDialogOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
