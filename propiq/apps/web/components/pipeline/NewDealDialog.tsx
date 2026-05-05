"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Contact, PipelineType } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewDealDialog({ open, onClose, onCreated }: Props) {
  const t = useTranslations("pipeline");
  const tCommon = useTranslations("common");
  const [title, setTitle] = useState("");
  const [pipelineType, setPipelineType] = useState<PipelineType>("SALES");
  const [value, setValue] = useState("");
  const [probability, setProbability] = useState("20");
  const [expectedClose, setExpectedClose] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setValue("");
    setExpectedClose("");
    setContactId(null);
    setError(null);
    api
      .get("/api/contacts", { params: { limit: 200 } })
      .then((res) => setContacts(unwrap<Contact[]>(res)))
      .catch(() => setContacts([]));
  }, [open]);

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/deals", {
        title: title.trim(),
        pipelineType,
        dealType: pipelineType === "LEASE" ? "RENT" : "SALE",
        value: value ? Number(value) : null,
        probability: Number(probability) || 20,
        expectedClose: expectedClose
          ? new Date(expectedClose).toISOString()
          : null,
        contactId: contactId,
      });
      onCreated();
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
        className="card w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold">{t("create")}</h2>

        <div>
          <label className="label">{tCommon("submit")}</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={255}
            placeholder="2BR The Pearl — Aisha Al-Thani"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("title")}</label>
            <select
              className="input"
              value={pipelineType}
              onChange={(e) => setPipelineType(e.target.value as PipelineType)}
            >
              <option value="SALES">{t("sales")}</option>
              <option value="LEASE">{t("lease")}</option>
            </select>
          </div>
          <div>
            <label className="label">{t("value")}</label>
            <input
              type="number"
              className="input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={0}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("probability")}</label>
            <input
              type="number"
              className="input"
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
              min={0}
              max={100}
            />
          </div>
          <div>
            <label className="label">{t("expectedClose")}</label>
            <input
              type="date"
              className="input"
              value={expectedClose}
              onChange={(e) => setExpectedClose(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Contact</label>
          <select
            className="input"
            value={contactId ?? ""}
            onChange={(e) => setContactId(e.target.value || null)}
          >
            <option value="">—</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.firstName, c.lastName].filter(Boolean).join(" ")} · {c.phone}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            disabled={submitting}
          >
            {tCommon("cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? <Spinner /> : tCommon("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
