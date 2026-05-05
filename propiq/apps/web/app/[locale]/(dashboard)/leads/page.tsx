import { getTranslations } from "next-intl/server";
import { StubPage } from "@/components/layout/StubPage";

export default async function LeadsPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale: params.locale, namespace: "dashboard" });
  return <StubPage feature={t("leads")} />;
}
