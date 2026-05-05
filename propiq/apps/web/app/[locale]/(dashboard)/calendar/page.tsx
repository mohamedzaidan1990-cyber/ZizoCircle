import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { CalendarView } from "@/components/calendar/CalendarView";

export default async function CalendarPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "calendar" });
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <CalendarView locale={locale} />
    </div>
  );
}
