"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import type { Contact } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

type Channel = "WHATSAPP" | "EMAIL";

interface Message {
  channel: Channel;
  language: "EN" | "AR";
  subject: string | null;
  body: string;
}

interface Props {
  contact: Contact | null;
  onClose: () => void;
  onLogged: () => void;
}

export function ReactivateDialog({ contact, onClose, onLogged }: Props) {
  const t = useTranslations("contacts");
  const tCommon = useTranslations("common");
  const [channel, setChannel] = useState<Channel>("WHATSAPP");
  const [message, setMessage] = useState<Message | null>(null);
  const [generating, setGenerating] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async (ch: Channel) => {
    if (!contact) return;
    setGenerating(true);
    setError(null);
    setMessage(null);
    setCopied(false);
    try {
      const res = await api.post("/api/ai/reactivate", {
        contactId: contact.id,
        channel: ch,
        logActivity: false,
      });
      setMessage(unwrap<Message>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (contact) {
      setChannel("WHATSAPP");
      generate("WHATSAPP");
    } else {
      setMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id]);

  if (!contact) return null;

  const onCopy = async () => {
    if (!message) return;
    const text = message.subject
      ? `${message.subject}\n\n${message.body}`
      : message.body;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const onLogAndCopy = async () => {
    if (!contact) return;
    setLogging(true);
    setError(null);
    try {
      const res = await api.post("/api/ai/reactivate", {
        contactId: contact.id,
        channel,
        logActivity: true,
      });
      const m = unwrap<Message>(res);
      const text = m.subject ? `${m.subject}\n\n${m.body}` : m.body;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onLogged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLogging(false);
    }
  };

  const fullName =
    contact.firstNameAr && contact.lastNameAr
      ? `${contact.firstNameAr} ${contact.lastNameAr}`.trim()
      : `${contact.firstName} ${contact.lastName ?? ""}`.trim();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="card w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="inline-flex items-center gap-1.5 text-lg font-semibold">
              <Sparkles className="h-4 w-4 text-brand-700" />
              {t("reactivateTitle", { name: fullName })}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {contact.contactType} · {t(`pipeline_${contact.pipelineType}`)}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost text-sm">
            {tCommon("cancel")}
          </button>
        </div>

        <div className="flex gap-1 rounded-md bg-slate-100 p-1">
          {(["WHATSAPP", "EMAIL"] as Channel[]).map((ch) => (
            <button
              key={ch}
              onClick={() => {
                setChannel(ch);
                generate(ch);
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                channel === ch
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600"
              }`}
            >
              {t(`channel${ch}`)}
            </button>
          ))}
        </div>

        {generating && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Spinner /> {t("reactivating")}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && !generating && (
          <div className="space-y-3">
            {message.subject && (
              <div>
                <label className="label">{t("subject")}</label>
                <input
                  className="input"
                  readOnly
                  value={message.subject}
                  dir={message.language === "AR" ? "rtl" : "ltr"}
                />
              </div>
            )}
            <div>
              <label className="label">{t("messageBody")}</label>
              <textarea
                className="input min-h-[180px] whitespace-pre-wrap"
                readOnly
                value={message.body}
                dir={message.language === "AR" ? "rtl" : "ltr"}
              />
            </div>
          </div>
        )}

        {copied && (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {t("copied")}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => generate(channel)}
            disabled={generating || !message}
            className="btn-ghost text-sm"
          >
            {t("regenerate")}
          </button>
          <button
            onClick={onCopy}
            disabled={!message}
            className="btn-ghost text-sm"
          >
            {t("copy")}
          </button>
          <button
            onClick={onLogAndCopy}
            disabled={!message || logging}
            className="btn-primary text-sm"
          >
            {logging ? <Spinner /> : t("logAndCopy")}
          </button>
        </div>
      </div>
    </div>
  );
}
