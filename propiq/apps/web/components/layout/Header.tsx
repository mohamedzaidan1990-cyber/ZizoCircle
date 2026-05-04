"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import type { PublicAgency, PublicUser } from "@propiq/shared";
import { logoutAction } from "@/lib/auth-actions";

export function Header({
  locale,
  user,
  agency,
}: {
  locale: string;
  user: PublicUser;
  agency: PublicAgency;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const otherLocale = locale === "en" ? "ar" : "en";
  const switchLocale = () => {
    const segments = pathname.split("/");
    if (segments[1] === locale) segments[1] = otherLocale;
    router.push(segments.join("/") || `/${otherLocale}`);
  };

  const onLogout = () => {
    startTransition(async () => {
      await logoutAction(locale);
    });
  };

  const fullName =
    locale === "ar" && user.firstNameAr
      ? `${user.firstNameAr} ${user.lastNameAr ?? ""}`.trim()
      : `${user.firstName} ${user.lastName}`;

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between">
      <div className="text-sm text-slate-500">
        {locale === "ar" && agency.nameAr ? agency.nameAr : agency.name}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={switchLocale} className="btn-ghost text-xs uppercase">
          {otherLocale === "ar" ? t("arabic") : t("english")}
        </button>
        <div className="text-sm text-slate-700 hidden sm:block">{fullName}</div>
        <button onClick={onLogout} disabled={isPending} className="btn-ghost text-sm">
          {isPending ? t("loading") : t("logout")}
        </button>
      </div>
    </header>
  );
}
