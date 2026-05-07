"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Tier } from "./LeadsBoard";

const TIERS: Tier[] = ["hot", "warm", "cold", "dead"];

export function LeadsFilters({
  locale,
  activeTier,
  counts,
}: {
  locale: string;
  activeTier: Tier | undefined;
  counts: Record<Tier, number>;
}) {
  const t = useTranslations("leads");

  const base = `/${locale}/leads`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={base}
        className={cn(
          "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          !activeTier
            ? "border-brand-700 bg-brand-50 text-brand-700"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
        )}
      >
        {t("filterAll")}
      </Link>
      {TIERS.map((tier) => (
        <Link
          key={tier}
          href={`${base}?tier=${tier}`}
          className={cn(
            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            activeTier === tier
              ? tierActiveClass(tier)
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
          )}
        >
          {t(`tier_${tier}` as const)} ({counts[tier] ?? 0})
        </Link>
      ))}
    </div>
  );
}

function tierActiveClass(tier: Tier): string {
  switch (tier) {
    case "hot":
      return "border-red-300 bg-red-50 text-red-700";
    case "warm":
      return "border-amber-300 bg-amber-50 text-amber-700";
    case "cold":
      return "border-blue-300 bg-blue-50 text-blue-700";
    case "dead":
      return "border-slate-300 bg-slate-100 text-slate-600";
  }
}
