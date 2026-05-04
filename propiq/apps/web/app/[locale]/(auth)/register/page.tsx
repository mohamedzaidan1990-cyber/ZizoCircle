import { RegisterForm } from "@/components/auth/RegisterForm";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function RegisterPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t("registerTitle")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("registerSubtitle")}</p>

      <div className="mt-6">
        <RegisterForm locale={locale} />
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        {t("registerHaveAccount")}{" "}
        <Link
          href={`/${locale}/login`}
          className="font-semibold text-brand hover:text-brand-700"
        >
          {t("registerSignIn")}
        </Link>
      </p>
    </div>
  );
}
