"use client";

import { useTranslations } from "next-intl";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  const t = useTranslations("common");
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="btn-ghost disabled:opacity-40"
      >
        {t("previous")}
      </button>
      <span>
        {t("page")} {page} {t("of")} {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="btn-ghost disabled:opacity-40"
      >
        {t("next")}
      </button>
    </div>
  );
}
