"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export function ContactImport() {
  const t = useTranslations("contacts");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<{ data: ImportResult; success: boolean }>(
        "/api/contacts/import",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (!res.data.success) throw new Error("Import failed");
      setResult(res.data.data);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="btn-ghost cursor-pointer inline-flex items-center gap-1">
        {busy ? <Spinner /> : <Upload className="h-4 w-4" />}
        {t("importCsv")}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onChange}
          disabled={busy}
        />
      </label>
      {result && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {t("imported", { count: result.imported })}{" "}
          {result.skipped > 0 && t("importSkipped", { count: result.skipped })}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
