"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  StickyNote,
  Phone,
  Mail,
  MessageSquare,
  CalendarDays,
  Eye,
  CheckSquare,
} from "lucide-react";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

export type ActivityType =
  | "NOTE"
  | "CALL"
  | "EMAIL"
  | "WHATSAPP"
  | "SMS"
  | "MEETING"
  | "VIEWING"
  | "TASK";

export interface Activity {
  id: string;
  activityType: ActivityType;
  direction: "INBOUND" | "OUTBOUND" | null;
  subject: string | null;
  body: string | null;
  status: string;
  scheduledAt: string | null;
  completedAt: string | null;
  contactId: string | null;
  dealId: string | null;
  propertyId: string | null;
  createdBy: string;
  createdAt: string;
}

const ICONS: Record<ActivityType, typeof StickyNote> = {
  NOTE: StickyNote,
  CALL: Phone,
  EMAIL: Mail,
  WHATSAPP: MessageSquare,
  SMS: MessageSquare,
  MEETING: CalendarDays,
  VIEWING: Eye,
  TASK: CheckSquare,
};

interface Props {
  contactId?: string;
  dealId?: string;
  propertyId?: string;
}

export function Timeline({ contactId, dealId, propertyId }: Props) {
  const t = useTranslations("activities");
  const [items, setItems] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const params = { contactId, dealId, propertyId };

  const load = async () => {
    setError(null);
    try {
      const res = await api.get("/api/activities", {
        params: { contactId, dealId, propertyId, limit: 100 },
      });
      setItems(unwrap<Activity[]>(res));
    } catch (err) {
      setError(getErrorMessage(err));
      setItems([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, dealId, propertyId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/activities", {
        activityType: "NOTE",
        subject: subject.trim() || null,
        body: body.trim(),
        ...params,
      });
      setSubject("");
      setBody("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
      </div>

      <form onSubmit={onSubmit} className="card p-4 space-y-2">
        <input
          className="input"
          placeholder={t("noteSubject")}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={255}
        />
        <textarea
          className="input min-h-[80px]"
          placeholder={t("noteBody")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || !body.trim()}
          >
            {submitting ? <Spinner /> : t("logNote")}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {items === null ? (
        <div className="card p-6 text-center">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-500">
          {t("empty")}
        </div>
      ) : (
        <ol className="relative space-y-3 ps-6 before:absolute before:start-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
          {items.map((a) => {
            const Icon = ICONS[a.activityType] ?? StickyNote;
            const ts = a.completedAt ?? a.createdAt;
            return (
              <li key={a.id} className="relative">
                <span className="absolute -start-6 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-brand-200">
                  <Icon className="h-3 w-3 text-brand-700" />
                </span>
                <div className="card p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      {t(`type_${a.activityType}`)}
                    </span>
                    <time dateTime={ts}>
                      {new Date(ts).toLocaleString()}
                    </time>
                  </div>
                  {a.subject && (
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {a.subject}
                    </p>
                  )}
                  {a.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {a.body}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
