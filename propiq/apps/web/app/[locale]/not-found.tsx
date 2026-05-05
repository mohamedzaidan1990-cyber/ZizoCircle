import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          404
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-3 text-slate-600">{t("description")}</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
