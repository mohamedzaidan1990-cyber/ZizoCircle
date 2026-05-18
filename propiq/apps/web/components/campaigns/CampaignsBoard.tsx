"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, Pause, Play, Plus, Send } from "lucide-react";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { NewCampaignDialog } from "./NewCampaignDialog";
import type { CampaignWithStats } from "@/app/[locale]/(dashboard)/campaigns/page";

const STATUS_STYLE: Record<CampaignWithStats["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-300",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-300",
  RUNNING: "bg-amber-50 text-amber-700 border-amber-300",
  PAUSED: "bg-orange-50 text-orange-700 border-orange-300",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-300",
  FAILED: "bg-red-50 text-red-700 border-red-300",
};

export function CampaignsBoard({
  initial,
  locale,
}: {
  initial: CampaignWithStats[];
  locale: string;
}) {
  const t = useTranslations("campaigns");
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const res = await api.get("/api/propify/campaigns");
      setCampaigns(unwrap<CampaignWithStats[]>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const transition = async (
    id: string,
    action: "send" | "pause" | "resume",
  ) => {
    setBusy(id);
    setError(null);
    try {
      await api.post(`/api/propify/campaigns/${id}/${action}`);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">
          {t("listTitle")}
        </h2>
        <button
          onClick={() => setDialogOpen(true)}
          className="btn-primary inline-flex items-center gap-1.5 text-sm"
        >
          <Plus className="h-4 w-4" />
          {t("newCampaign")}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
          <Megaphone className="h-8 w-8 text-slate-300" />
          <div className="text-sm text-slate-600">{t("empty")}</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">
                    {t("colName")}
                  </th>
                  <th className="px-4 py-2 text-start font-medium">
                    {t("colTemplate")}
                  </th>
                  <th className="px-4 py-2 text-start font-medium">
                    {t("colStatus")}
                  </th>
                  <th className="px-4 py-2 text-end font-medium">
                    {t("colRecipients")}
                  </th>
                  <th className="px-4 py-2 text-end font-medium">
                    {t("colSent")}
                  </th>
                  <th className="px-4 py-2 text-end font-medium">
                    {t("colDelivered")}
                  </th>
                  <th className="px-4 py-2 text-end font-medium">
                    {t("colReplied")}
                  </th>
                  <th className="px-4 py-2 text-start font-medium">
                    {t("colCreated")}
                  </th>
                  <th className="px-4 py-2 text-end font-medium">
                    {t("colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const isBusy = busy === c.id;
                  const dateFmt = new Intl.DateTimeFormat(
                    locale === "ar" ? "ar-QA" : "en-US",
                    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
                  );
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {c.name}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        <span className="font-mono text-xs">
                          {c.templateName}
                        </span>
                        <span className="ms-2 text-xs text-slate-400">
                          {c.templateLang}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`}
                        >
                          {c.status === "RUNNING" && (
                            <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" />
                          )}
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-end tabular-nums text-slate-700">
                        {c.stats.totalRecipients}
                      </td>
                      <td className="px-4 py-2 text-end tabular-nums text-slate-700">
                        {c.stats.sent}
                      </td>
                      <td className="px-4 py-2 text-end tabular-nums text-slate-700">
                        {c.stats.delivered}
                      </td>
                      <td className="px-4 py-2 text-end tabular-nums text-slate-700">
                        {c.stats.replied}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {dateFmt.format(new Date(c.createdAt))}
                      </td>
                      <td className="px-4 py-2 text-end">
                        {isBusy ? (
                          <Spinner />
                        ) : c.status === "DRAFT" || c.status === "SCHEDULED" ? (
                          <button
                            onClick={() => transition(c.id, "send")}
                            className="btn-ghost inline-flex items-center gap-1 text-xs text-emerald-700"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {t("actionSend")}
                          </button>
                        ) : c.status === "RUNNING" ? (
                          <button
                            onClick={() => transition(c.id, "pause")}
                            className="btn-ghost inline-flex items-center gap-1 text-xs text-orange-700"
                          >
                            <Pause className="h-3.5 w-3.5" />
                            {t("actionPause")}
                          </button>
                        ) : c.status === "PAUSED" ? (
                          <button
                            onClick={() => transition(c.id, "resume")}
                            className="btn-ghost inline-flex items-center gap-1 text-xs text-emerald-700"
                          >
                            <Play className="h-3.5 w-3.5" />
                            {t("actionResume")}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NewCampaignDialog
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
