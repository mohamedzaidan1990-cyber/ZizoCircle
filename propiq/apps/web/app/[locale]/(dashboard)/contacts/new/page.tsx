import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactForm } from "@/components/contacts/ContactForm";

export default async function NewContactPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "contacts" });
  return (
    <div className="space-y-6">
      <PageHeader title={t("create")} />
      <div className="card p-6">
        <ContactForm locale={locale} />
      </div>
    </div>
  );
}
