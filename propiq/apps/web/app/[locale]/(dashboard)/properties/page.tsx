import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PropertiesGrid } from "@/components/properties/PropertiesGrid";

export default async function PropertiesPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "properties" });
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <Link
            href={`/${locale}/properties/new`}
            className="btn-primary inline-flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {t("newProperty")}
          </Link>
        }
      />
      <PropertiesGrid locale={locale} />
    </div>
  );
}
