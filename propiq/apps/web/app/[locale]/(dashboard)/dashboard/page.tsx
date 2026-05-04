import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-slate-600">{t("welcome", { name })}</p>
      </div>

      <div className="card p-6">
        <p className="text-slate-700">{t("summary")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["leads", "contacts", "properties", "pipeline"] as const).map((key) => (
          <div key={key} className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t(key)}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">0</div>
          </div>
        ))}
      </div>
    </div>
  );
}
