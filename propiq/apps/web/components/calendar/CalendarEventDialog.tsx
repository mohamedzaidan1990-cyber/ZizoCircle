"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Contact, Deal } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

type EventType = "VIEWING" | "TASK" | "MEETING" | "AI_CALL";

const TYPES: EventType[] = ["VIEWING", "TASK", "MEETING", "AI_CALL"];

export interface CalendarEventInitial {
  id?: string;
  activityType: EventType;
  subject: string;
  body: string;
  scheduledAt: string;
  durationMinutes: number;
  contactId: string | null;
  dealId: string | null;
}

interface Props {
  open: boolean;
  initial: CalendarEventInitial | null;
  onClose: () => void;
  onSaved: () => void;
}

function toLocalInput(iso: string): string {
  // datetime-local expects "YYYY-MM-DDTHH:mm"
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarEventDialog({
  open,
  initial,
  onClose,
  onSaved,
}: Props) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const [type, setType] = useState<EventType>("VIEWING");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [contactId, setContactId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !initial) return;
    setType(initial.activityType);
    setSubject(initial.subject);
    setBody(initial.body);
    setScheduledAt(toLocalInput(initial.scheduledAt));
    setDuration(initial.durationMinutes);
    setContactId(initial.contactId);
    setError(null);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    api
      .get("/api/contacts", { params: { limit: 200 } })
      .then((res) => setContacts(unwrap<Contact[]>(res)))
      .catch(() => setContacts([]));
  }, [open]);

  if (!open || !initial) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const iso = new Date(scheduledAt).toISOString();
      const payload = {
        activityType: type,
        subject: subject.trim() || null,
        body: body.trim() || null,
        scheduledAt: iso,
        completedAt: iso,
        durationSeconds: duration * 60,
        contactId: contactId,
        status: "SCHEDULED",
      };
      if (initial.id) {
        // We don't have a PATCH on activities yet, so emulate by deleting + recreating.
        await api.delete(`/api/activities/${initial.id}`);
      }
      await api.post("/api/activities", payload);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!initial.id) return;
    if (!confirm(tCommon("confirmDelete"))) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/activities/${initial.id}`);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
      <form
        onSubmit={onSubmit}
        className="card w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold">
          {initial.id ? t("edit") : t("create")}
        </h2>

        <div>
          <label className="label">{t("type")}</label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
          >
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {t(`type_${ty}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">{t("subject")}</label>
          <input
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={255}
          />
        </div>

        <div>
          <label className="label">{t("scheduledAt")}</label>
          <input
            type="datetime-local"
            className="input"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">{t("duration")}</label>
          <input
            type="number"
            className="input"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 60)}
            min={5}
            max={600}
          />
        </div>

        <div>
          <label className="label">{t("linkedContact")}</label>
          <select
            className="input"
            value={contactId ?? ""}
            onChange={(e) => setContactId(e.target.value || null)}
          >
            <option value="">{t("noContact")}</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.firstName, c.lastName].filter(Boolean).join(" ")} · {c.phone}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">{tCommon("notes")}</label>
          <textarea
            className="input min-h-[80px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-between gap-2">
          {initial.id ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting || submitting}
              className="btn-ghost text-sm text-red-600"
            >
              {deleting ? <Spinner /> : tCommon("delete")}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              disabled={submitting}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !scheduledAt}
            >
              {submitting ? <Spinner /> : tCommon("save")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
