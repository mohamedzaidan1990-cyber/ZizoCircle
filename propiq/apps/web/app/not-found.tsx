import Link from "next/link";
import { defaultLocale } from "@/i18n/config";
import "./globals.css";

export default function RootNotFound() {
  return (
    <html lang={defaultLocale} dir="ltr">
      <body className="font-sans">
        <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">
              404
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Page not found
            </h1>
            <p className="mt-3 text-slate-600">
              The page you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link
              href={`/${defaultLocale}`}
              className="btn-primary mt-6 inline-flex"
            >
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
