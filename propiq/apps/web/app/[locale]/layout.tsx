import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale, type Locale, localeDirection } from "@/i18n/config";

export const metadata: Metadata = {
  title: "PropIQ",
  description: "AI-Native Real Estate CRM",
};

interface Props {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages();
  const dir = localeDirection(locale as Locale);

  return (
    <html lang={locale} dir={dir}>
      <body className={dir === "rtl" ? "font-arabic" : "font-sans"}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
