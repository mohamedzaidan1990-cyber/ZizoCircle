import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

export default async function SettingsPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <SettingsTabs />
    </div>
  );
}
