import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "./i18n/config";

const intlMiddleware = createIntlMiddleware({
  locales: locales as unknown as string[],
  defaultLocale,
  localePrefix: "always",
});

const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  // Strip the /<locale>/ prefix for the check.
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return true;
  const rest = "/" + segments.slice(1).join("/");
  return PUBLIC_PATHS.some((p) => rest === p || rest.startsWith(`${p}/`));
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let the next-intl middleware handle locale routing first.
  const response = intlMiddleware(req);

  // Auth gate: any non-public path under a locale requires the access token cookie.
  if (!isPublicPath(pathname)) {
    const token = req.cookies.get("propiq_access")?.value;
    if (!token) {
      const segments = pathname.split("/").filter(Boolean);
      const locale =
        segments[0] && (locales as readonly string[]).includes(segments[0])
          ? segments[0]
          : defaultLocale;
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
