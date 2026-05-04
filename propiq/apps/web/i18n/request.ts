import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale } from "./config";

export default getRequestConfig(async ({ locale }) => {
  const resolved = locale ?? defaultLocale;
  if (!isLocale(resolved)) notFound();

  return {
    locale: resolved,
    messages: (await import(`../messages/${resolved}.json`)).default,
  };
});
