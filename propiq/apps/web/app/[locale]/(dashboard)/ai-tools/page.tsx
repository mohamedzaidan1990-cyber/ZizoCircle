import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiToolsTabs } from "@/components/ai/AiToolsTabs";

export default async function AiToolsPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "ai" });
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <AiToolsTabs />
    </div>
  );
}
