import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactImport } from "@/components/contacts/ContactImport";
import { ContactExportLink } from "@/components/contacts/ContactExportLink";

export default async function ContactsPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "contacts" });
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <>
            <ContactImport />
            <ContactExportLink />
            <Link
              href={`/${locale}/contacts/new`}
              className="btn-primary inline-flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              {t("newContact")}
            </Link>
          </>
        }
      />
      <p className="text-xs text-slate-500">{t("csvHelp")}</p>
      <ContactsTable locale={locale} />
    </div>
  );
}
