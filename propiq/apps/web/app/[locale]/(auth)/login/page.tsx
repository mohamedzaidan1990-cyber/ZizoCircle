import { LoginForm } from "@/components/auth/LoginForm";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function LoginPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t("loginTitle")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("loginSubtitle")}</p>

      <div className="mt-6">
        <LoginForm locale={locale} />
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        {t("loginNoAccount")}{" "}
        <Link
          href={`/${locale}/register`}
          className="font-semibold text-brand hover:text-brand-700"
        >
          {t("loginCreateAccount")}
        </Link>
      </p>
    </div>
  );
}
