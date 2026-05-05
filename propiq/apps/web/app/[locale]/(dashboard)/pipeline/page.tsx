import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";

export default async function PipelinePage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "pipeline" });
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <PipelineBoard locale={locale} />
    </div>
  );
}
