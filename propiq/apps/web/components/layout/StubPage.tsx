import { getTranslations } from "next-intl/server";
import { PageHeader } from "./PageHeader";

interface Props {
  feature: string;
}

export async function StubPage({ feature }: Props) {
  const t = await getTranslations("stub");
  return (
    <div className="space-y-6">
      <PageHeader title={feature} subtitle={t("comingSoon")} />
      <div className="card p-8 text-center text-slate-600">
        {t("comingSoonHint")}
      </div>
    </div>
  );
}
