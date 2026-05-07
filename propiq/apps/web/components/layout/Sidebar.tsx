"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Kanban,
  Sparkles,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicAgency } from "@propiq/shared";

const NAV = [
  { href: "dashboard", icon: LayoutDashboard, key: "title", badge: null },
  { href: "leads", icon: UserPlus, key: "leads", badge: "AI" as const },
  { href: "contacts", icon: Users, key: "contacts", badge: null },
  { href: "properties", icon: Building2, key: "properties", badge: null },
  { href: "pipeline", icon: Kanban, key: "pipeline", badge: null },
  { href: "ai-tools", icon: Sparkles, key: "aiTools", badge: null },
  { href: "reports", icon: BarChart3, key: "reports", badge: null },
  { href: "settings", icon: Settings, key: "settingsNav", badge: null },
] as const;

export function Sidebar({
  locale,
  agency,
}: {
  locale: string;
  agency: PublicAgency;
}) {
  const t = useTranslations("dashboard");
  const tApp = useTranslations("app");
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-e border-slate-200 min-h-screen">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="text-lg font-bold text-brand">{tApp("name")}</div>
        <div className="mt-1 text-sm text-slate-600 truncate">
          {locale === "ar" && agency.nameAr ? agency.nameAr : agency.name}
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, icon: Icon, key, badge }) => {
          const url = `/${locale}/${href}`;
          const active = pathname === url || pathname.startsWith(`${url}/`);
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
              <span className="flex-1">{t(key)}</span>
              {badge ? (
                <span className="rounded-full bg-brand-50 border border-brand-700/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
