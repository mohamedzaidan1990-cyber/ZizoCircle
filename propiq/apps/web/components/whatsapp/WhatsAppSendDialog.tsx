"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import type { Contact } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface Template {
  id: string;
  name: string;
  channel: string;
  bodyEn: string;
  bodyAr: string | null;
}

interface Props {
  contact: Contact;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export function WhatsAppSendDialog({ contact, open, onClose, onSent }: Props) {
  const t = useTranslations("whatsapp");
  const tCommon = useTranslations("common");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTemplateId("");
    setBody("");
    setDone(null);
    setError(null);
    api
      .get("/api/templates", { params: { channel: "WHATSAPP" } })
      .then((res) => setTemplates(unwrap<Template[]>(res)))
      .catch(() => setTemplates([]));
  }, [open]);

  if (!open) return null;

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setDone(null);
    try {
      const res = await api.post("/api/whatsapp/send", {
        contactId: contact.id,
        ...(templateId ? { templateId } : { body }),
      });
      const data = unwrap<{ delivered: boolean }>(res);
      setDone(data.delivered ? t("sent") : t("sentDev"));
      onSent?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
      <form
        onSubmit={onSend}
        className="card w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {[contact.firstName, contact.lastName].filter(Boolean).join(" ")} ·{" "}
              {contact.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-sm"
            disabled={sending}
          >
            {tCommon("cancel")}
          </button>
        </div>

        <div>
          <label className="label">{t("templateLabel")}</label>
          <select
            className="input"
            value={templateId}
            onChange={(e) => {
              const id = e.target.value;
              setTemplateId(id);
              if (id) {
                const tpl = templates.find((tp) => tp.id === id);
                setBody(tpl?.bodyEn ?? "");
              }
            }}
          >
            <option value="">{t("templateNone")}</option>
            {templates.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {tp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">{t("messageLabel")}</label>
          <textarea
            className="input min-h-[140px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi {firstName}, ..."
            required={!templateId}
            disabled={Boolean(templateId)}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {done && (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {done}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={sending || (!templateId && !body.trim())}
            className="btn-primary inline-flex items-center gap-1"
          >
            {sending ? <Spinner /> : <Send className="h-4 w-4" />}
            {sending ? t("sending") : t("send")}
          </button>
        </div>
      </form>
    </div>
  );
}
