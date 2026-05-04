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
  { href: "dashboard", icon: LayoutDashboard, key: "title" },
  { href: "leads", icon: UserPlus, key: "leads" },
  { href: "contacts", icon: Users, key: "contacts" },
  { href: "properties", icon: Building2, key: "properties" },
  { href: "pipeline", icon: Kanban, key: "pipeline" },
  { href: "ai-tools", icon: Sparkles, key: "aiTools" },
  { href: "reports", icon: BarChart3, key: "reports" },
  { href: "settings", icon: Settings, key: "settingsNav" },
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
        {NAV.map(({ href, icon: Icon, key }) => {
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
              {t(key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
