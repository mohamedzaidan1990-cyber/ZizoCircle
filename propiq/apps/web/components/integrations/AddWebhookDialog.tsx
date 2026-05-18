"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, getErrorMessage } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

const AVAILABLE_EVENTS = [
  "lead.qualified",
  "lead.updated",
  "lead.score_changed",
  "lead.opted_out",
  "campaign.message.replied",
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddWebhookDialog({ open, onClose, onCreated }: Props) {
  const t = useTranslations("integrations");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<Set<string>>(
    new Set(["lead.qualified"]),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setUrl("");
    setSecret("");
    setEvents(new Set(["lead.qualified"]));
    setError(null);
  }, [open]);

  if (!open) return null;

  const toggleEvent = (event: string) => {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (events.size === 0) {
      setError(t("errorPickEvent"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/propify/webhooks", {
        name: name.trim(),
        url: url.trim(),
        secret: secret.trim() || null,
        events: [...events],
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
        className="card w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold">{t("addWebhook")}</h2>

        <div>
          <label className="label" htmlFor="wh-name">
            {t("fieldName")}
          </label>
          <input
            id="wh-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
            required
            placeholder="HubSpot — qualified leads"
          />
        </div>

        <div>
          <label className="label" htmlFor="wh-url">
            {t("fieldUrl")}
          </label>
          <input
            id="wh-url"
            type="url"
            className="input font-mono text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://api.example.com/propify/in"
          />
          <p className="mt-1 text-xs text-slate-500">{t("urlHint")}</p>
        </div>

        <div>
          <label className="label" htmlFor="wh-secret">
            {t("fieldSecret")}
          </label>
          <input
            id="wh-secret"
            type="password"
            className="input font-mono text-sm"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            minLength={8}
            maxLength={255}
            placeholder=""
          />
          <p className="mt-1 text-xs text-slate-500">{t("secretHint")}</p>
        </div>

        <div>
          <label className="label">{t("fieldEvents")}</label>
          <div className="mt-1 space-y-1.5">
            {AVAILABLE_EVENTS.map((event) => (
              <label
                key={event}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={events.has(event)}
                  onChange={() => toggleEvent(event)}
                />
                <span className="font-mono text-xs text-slate-800">{event}</span>
                <span className="text-xs text-slate-500">
                  · {t(`event_${event.replace(".", "_")}` as const)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
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
            {t("actionCreate")}
          </button>
        </div>
      </form>
    </div>
  );
}
