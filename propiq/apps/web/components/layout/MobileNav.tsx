"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Kanban,
  Calendar,
  Sparkles,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicAgency } from "@propiq/shared";

const NAV = [
  { href: "dashboard", icon: LayoutDashboard, key: "title" },
  { href: "leads", icon: UserPlus, key: "leads" },
  { href: "contacts", icon: Users, key: "contacts" },
  { href: "properties", icon: Building2, key: "properties" },
  { href: "pipeline", icon: Kanban, key: "pipeline" },
  { href: "calendar", icon: Calendar, key: "calendar" },
  { href: "ai-tools", icon: Sparkles, key: "aiTools" },
  { href: "reports", icon: BarChart3, key: "reports" },
  { href: "settings", icon: Settings, key: "settingsNav" },
] as const;

export function MobileNav({
  locale,
  agency,
}: {
  locale: string;
  agency: PublicAgency;
}) {
  const t = useTranslations("dashboard");
  const tApp = useTranslations("app");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Auto-close when route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden btn-ghost p-2"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <aside className="w-72 max-w-[80vw] bg-white border-s border-slate-200 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <div className="text-base font-bold text-brand">
                  {tApp("name")}
                </div>
                <div className="mt-0.5 text-xs text-slate-600 truncate">
                  {locale === "ar" && agency.nameAr
                    ? agency.nameAr
                    : agency.name}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="btn-ghost p-1"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV.map(({ href, icon: Icon, key }) => {
                const url = `/${locale}/${href}`;
                const active =
                  pathname === url || pathname.startsWith(`${url}/`);
                return (
                  <Link
                    key={href}
                    href={url}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(key)}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
