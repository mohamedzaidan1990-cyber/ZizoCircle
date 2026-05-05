import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";

export default async function ReportsPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "reports" });
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <ReportsDashboard />
    </div>
  );
}
