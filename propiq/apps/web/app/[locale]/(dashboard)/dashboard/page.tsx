import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsWidgets } from "@/components/dashboard/StatsWidgets";
import { AiInsightsFeed } from "@/components/dashboard/AiInsightsFeed";

export default async function DashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const user = await getCurrentUser();
  const t = await getTranslations({ locale, namespace: "dashboard" });

  const name = user
    ? locale === "ar" && user.firstNameAr
      ? user.firstNameAr
      : user.firstName
    : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("welcome", { name })}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StatsWidgets />
        </div>
        <div className="lg:col-span-1">
          <AiInsightsFeed />
        </div>
      </div>
    </div>
  );
}
