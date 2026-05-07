"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, X } from "lucide-react";
import type { Deal, DealStage } from "@propiq/shared";
import { DEAL_STAGES } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { Timeline } from "@/components/activities/Timeline";

interface Props {
  dealId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function DealSlideOver({ dealId, onClose, onChanged }: Props) {
  const t = useTranslations("pipeline");
  const tCommon = useTranslations("common");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Deal>>({});

  useEffect(() => {
    if (!dealId) {
      setDeal(null);
      setDraft({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/api/deals/${dealId}`);
        if (!cancelled) {
          const d = unwrap<Deal>(res);
          setDeal(d);
          setDraft(d);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  if (!dealId) return null;

  const set = <K extends keyof Deal>(key: K, value: Deal[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    if (!deal) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      const fields: Array<keyof Deal> = [
        "title",
        "stage",
        "value",
        "probability",
        "expectedClose",
        "lostReason",
        "notes",
      ];
      for (const f of fields) {
        if (draft[f] !== undefined && draft[f] !== deal[f]) {
          payload[f] =
            f === "expectedClose" && draft[f]
              ? new Date(draft[f] as string).toISOString()
              : draft[f];
        }
      }
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }
      const res = await api.patch(`/api/deals/${deal.id}`, payload);
      setDeal(unwrap<Deal>(res));
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deal) return;
    if (!confirm(tCommon("confirmDelete"))) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/deals/${deal.id}`);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  const formatDate = (iso?: string | null): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="fixed inset-0 z-30">
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
      />
      <aside className="absolute end-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">
            {loading ? <Spinner /> : t("title")}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-5 space-y-5">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {deal && (
            <>
              <div>
                <label className="label">{tCommon("submit")}</label>
                <input
                  className="input"
                  value={draft.title ?? ""}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">{tCommon("filters")}</label>
                  <select
                    className="input"
                    value={draft.stage ?? deal.stage}
                    onChange={(e) =>
                      set("stage", e.target.value as DealStage)
                    }
                  >
                    {DEAL_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {t(`stage_${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t("probability")}</label>
                  <input
                    type="number"
                    className="input"
                    value={draft.probability ?? 0}
                    onChange={(e) =>
                      set("probability", Number(e.target.value) || 0)
                    }
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">{t("value")}</label>
                  <input
                    type="number"
                    className="input"
                    value={draft.value ?? ""}
                    onChange={(e) =>
                      set(
                        "value",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </div>
                <div>
                  <label className="label">{t("expectedClose")}</label>
                  <input
                    type="date"
                    className="input"
                    value={formatDate(draft.expectedClose ?? null)}
                    onChange={(e) =>
                      set(
                        "expectedClose",
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      )
                    }
                  />
                </div>
              </div>

              {(draft.stage === "CLOSED_LOST" ||
                deal.stage === "CLOSED_LOST") && (
                <div>
                  <label className="label">{t("lostReason")}</label>
                  <input
                    className="input"
                    value={draft.lostReason ?? ""}
                    onChange={(e) => set("lostReason", e.target.value || null)}
                  />
                </div>
              )}

              <div>
                <label className="label">{tCommon("notes")}</label>
                <textarea
                  className="input min-h-[80px]"
                  value={draft.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value || null)}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={onDelete}
                  disabled={deleting || saving}
                  className="btn-ghost inline-flex items-center gap-1 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? <Spinner /> : tCommon("delete")}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="btn-ghost"
                    disabled={saving}
                  >
                    {tCommon("cancel")}
                  </button>
                  <button
                    onClick={onSave}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? <Spinner /> : tCommon("save")}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <Timeline dealId={deal.id} contactId={deal.contactId ?? undefined} />
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
