import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { PropertyForm } from "@/components/properties/PropertyForm";

export default async function NewPropertyPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "properties" });
  return (
    <div className="space-y-6">
      <PageHeader title={t("create")} />
      <div className="card p-6">
        <PropertyForm locale={locale} />
      </div>
    </div>
  );
}
