"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function ContactExportLink() {
  const t = useTranslations("contacts");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const cookieMatch = document.cookie.match(
        /(?:^|; )propiq_access=([^;]+)/,
      );
      const token = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
      const res = await fetch(`${API_URL}/api/contacts/export.csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        className="btn-ghost inline-flex items-center gap-1"
        disabled={busy}
      >
        {busy ? <Spinner /> : <Download className="h-4 w-4" />}
        {t("exportCsv")}
      </button>
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
