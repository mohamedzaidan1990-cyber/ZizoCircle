"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Trash2, Pencil, MessageCircle, TrendingUp } from "lucide-react";
import type { Contact } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { ContactForm } from "./ContactForm";
import { ScoreLeadButton } from "./ScoreLeadButton";
import { Timeline } from "@/components/activities/Timeline";
import { WhatsAppSendDialog } from "@/components/whatsapp/WhatsAppSendDialog";
import { NewDealDialog } from "@/components/pipeline/NewDealDialog";

interface Props {
  locale: string;
  id: string;
}

export function ContactDetail({ locale, id }: Props) {
  const t = useTranslations("contacts");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const tWa = useTranslations("whatsapp");
  const tAi = useTranslations("ai");
  const tPipeline = useTranslations("pipeline");

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get(`/api/contacts/${id}`);
      setContact(unwrap<Contact>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onDelete = async () => {
    if (!confirm(tCommon("confirmDelete"))) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/contacts/${id}`);
      router.push(`/${locale}/contacts`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <Spinner />
      </div>
    );
  }
  if (error || !contact) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {error ?? "Not found"}
        <button onClick={load} className="btn-ghost ms-2 text-xs">
          {tCommon("retry")}
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="card p-6">
        <ContactForm
          locale={locale}
          initial={contact}
        />
      </div>
    );
  }

  const fullName =
    locale === "ar" && contact.firstNameAr
      ? `${contact.firstNameAr} ${contact.lastNameAr ?? ""}`.trim()
      : `${contact.firstName} ${contact.lastName ?? ""}`.trim();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
              <p className="text-sm text-slate-600">
                {t(`type_${contact.contactType}`)}
                {contact.source ? ` · ${contact.source}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${locale}/contacts`}
                className="btn-ghost text-sm"
              >
                {tCommon("back")}
              </Link>
              <button
                onClick={() => setWhatsappOpen(true)}
                className="btn-ghost inline-flex items-center gap-1 text-sm text-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                {tWa("send")}
              </button>
              <button
                onClick={() => setDealDialogOpen(true)}
                className="btn-ghost inline-flex items-center gap-1 text-sm text-brand-700"
              >
                <TrendingUp className="h-4 w-4" />
                {tPipeline("create")}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="btn-ghost inline-flex items-center gap-1 text-sm"
              >
                <Pencil className="h-4 w-4" />
                {tCommon("edit")}
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="btn-ghost inline-flex items-center gap-1 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                {tCommon("delete")}
              </button>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                {tCommon("phone")}
              </dt>
              <dd className="mt-1 text-slate-800">{contact.phone}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                {tCommon("email")}
              </dt>
              <dd className="mt-1 text-slate-800">{contact.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                {t("budget")}
              </dt>
              <dd className="mt-1 text-slate-800">
                {contact.budgetMin || contact.budgetMax
                  ? `${contact.budgetMin?.toLocaleString() ?? "—"} – ${contact.budgetMax?.toLocaleString() ?? "—"} ${contact.currency}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                {t("bedrooms")}
              </dt>
              <dd className="mt-1 text-slate-800">
                {contact.bedroomsMin || contact.bedroomsMax
                  ? `${contact.bedroomsMin ?? "—"} – ${contact.bedroomsMax ?? "—"}`
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                {t("preferredAreas")}
              </dt>
              <dd className="mt-1 text-slate-800">
                {contact.preferredAreas.length
                  ? contact.preferredAreas.join(", ")
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                {t("propertyTypes")}
              </dt>
              <dd className="mt-1 text-slate-800">
                {contact.propertyTypes.length
                  ? contact.propertyTypes.join(", ")
                  : "—"}
              </dd>
            </div>
            {contact.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wider text-slate-500">
                  {tCommon("notes")}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-800">
                  {contact.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card p-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">
            {tAi("tab_scorer")}
          </h3>
          <ScoreLeadButton
            contactId={contact.id}
            onScored={() => load()}
          />
        </div>
      </div>

      <div className="lg:col-span-1">
        <Timeline contactId={contact.id} />
      </div>

      <WhatsAppSendDialog
        contact={contact}
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        onSent={() => {
          setWhatsappOpen(false);
          load();
        }}
      />

      <NewDealDialog
        open={dealDialogOpen}
        onClose={() => setDealDialogOpen(false)}
        onCreated={() => {
          setDealDialogOpen(false);
          router.push(`/${locale}/pipeline`);
        }}
        presetContact={contact}
      />
    </div>
  );
}
