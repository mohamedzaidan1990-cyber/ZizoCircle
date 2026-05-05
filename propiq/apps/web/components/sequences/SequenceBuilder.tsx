"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Workflow,
  Pause,
  Play,
} from "lucide-react";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

interface Template {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
}

interface Step {
  templateId: string;
  delayHours: number;
}

interface Sequence {
  id: string;
  name: string;
  triggerType: string | null;
  steps: Step[];
  isActive: boolean;
  createdAt: string;
}

export function SequenceBuilder() {
  const t = useTranslations("sequences");
  const tCommon = useTranslations("common");
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [sequences, setSequences] = useState<Sequence[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    name: string;
    steps: Step[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [tplRes, seqRes] = await Promise.all([
        api.get("/api/templates", { params: { channel: "EMAIL" } }),
        api.get("/api/sequences"),
      ]);
      setTemplates(unwrap<Template[]>(tplRes));
      setSequences(unwrap<Sequence[]>(seqRes));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (!templates || !sequences) {
    return (
      <div className="card p-8 text-center">
        <Spinner />
      </div>
    );
  }

  const addStep = () => {
    if (!editing) return;
    const firstTpl = templates[0];
    if (!firstTpl) return;
    setEditing({
      ...editing,
      steps: [...editing.steps, { templateId: firstTpl.id, delayHours: 24 }],
    });
  };

  const updateStep = (idx: number, patch: Partial<Step>) => {
    if (!editing) return;
    const next = [...editing.steps];
    next[idx] = { ...next[idx], ...patch };
    setEditing({ ...editing, steps: next });
  };

  const removeStep = (idx: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      steps: editing.steps.filter((_, i) => i !== idx),
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const next = [...editing.steps];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setEditing({ ...editing, steps: next });
  };

  const save = async () => {
    if (!editing || editing.steps.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/sequences", {
        name: editing.name,
        steps: editing.steps,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(tCommon("confirmDelete"))) return;
    setError(null);
    setBusyId(id);
    try {
      await api.delete(`/api/sequences/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    setError(null);
    setBusyId(id);
    try {
      await api.patch(`/api/sequences/${id}`, { isActive });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t("hint")}</p>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {templates.length === 0 ? (
        <EmptyState title={t("noTemplates")} />
      ) : !editing ? (
        <>
          <div className="flex justify-end">
            <button
              onClick={() =>
                setEditing({
                  name: "",
                  steps: [{ templateId: templates[0].id, delayHours: 0 }],
                })
              }
              className="btn-primary inline-flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              {t("newSequence")}
            </button>
          </div>

          {sequences.length === 0 ? (
            <EmptyState title={t("noSequences")} />
          ) : (
            <div className="space-y-2">
              {sequences.map((s) => {
                const busy = busyId === s.id;
                return (
                  <div key={s.id} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold inline-flex items-center gap-1.5">
                          <Workflow className="h-4 w-4 text-brand-700" />
                          {s.name}
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              s.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {s.isActive ? t("active") : t("inactive")}
                          </span>
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {s.steps.length}{" "}
                          {s.steps.length === 1
                            ? t("step").toLowerCase()
                            : t("step").toLowerCase() + "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleActive(s.id, !s.isActive)}
                          disabled={busy}
                          className="btn-ghost inline-flex items-center gap-1 text-xs"
                        >
                          {busy ? (
                            <Spinner />
                          ) : s.isActive ? (
                            <>
                              <Pause className="h-3.5 w-3.5" />
                              {t("deactivate")}
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              {t("activate")}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => remove(s.id)}
                          disabled={busy}
                          className="btn-ghost text-xs text-red-600"
                          aria-label={tCommon("delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <ol className="mt-3 space-y-1 text-xs text-slate-600">
                      {s.steps.map((step, idx) => {
                        const tpl = templates.find(
                          (tpl) => tpl.id === step.templateId,
                        );
                        return (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                              {idx + 1}
                            </span>
                            <span className="font-medium">
                              {tpl?.name ?? "—"}
                            </span>
                            <span className="text-slate-400">
                              · +{step.delayHours}h
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="card p-4 space-y-4">
          <div>
            <label className="label">{t("sequenceName")}</label>
            <input
              className="input"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="New buyer onboarding"
            />
          </div>

          <div className="space-y-2">
            {editing.steps.map((step, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-center gap-2 rounded-md border border-slate-200 p-2"
              >
                <span className="col-span-2 sm:col-span-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                  {idx + 1}
                </span>
                <select
                  className="input col-span-10 sm:col-span-6"
                  value={step.templateId}
                  onChange={(e) =>
                    updateStep(idx, { templateId: e.target.value })
                  }
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={720}
                  className="input col-span-5 sm:col-span-2"
                  value={step.delayHours}
                  onChange={(e) =>
                    updateStep(idx, {
                      delayHours: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  aria-label={t("delay")}
                />
                <div className="col-span-7 sm:col-span-3 flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="btn-ghost p-1 disabled:opacity-30"
                    aria-label={t("moveUp")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === editing.steps.length - 1}
                    className="btn-ghost p-1 disabled:opacity-30"
                    aria-label={t("moveDown")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    disabled={editing.steps.length === 1}
                    className="btn-ghost p-1 text-red-600 disabled:opacity-30"
                    aria-label={t("removeStep")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="btn-ghost inline-flex items-center gap-1 text-sm"
            >
              <Plus className="h-4 w-4" />
              {t("addStep")}
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn-ghost"
              disabled={saving}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={
                saving || !editing.name.trim() || editing.steps.length === 0
              }
              className="btn-primary inline-flex items-center gap-1"
            >
              {saving ? <Spinner /> : <Save className="h-4 w-4" />}
              {t("saveSequence")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
