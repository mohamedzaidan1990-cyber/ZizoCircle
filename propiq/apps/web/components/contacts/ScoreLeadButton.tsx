"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import type { LeadScoreResult } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { LeadScoreCard } from "@/components/ai/LeadScorerPanel";

interface Props {
  contactId: string;
  /** Called after a successful score so the parent can refresh the contact. */
  onScored?: (result: LeadScoreResult) => void;
}

export function ScoreLeadButton({ contactId, onScored }: Props) {
  const t = useTranslations("ai");
  const [result, setResult] = useState<LeadScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/ai/lead-scorer/score", { contactId });
      const r = unwrap<LeadScoreResult>(res);
      setResult(r);
      onScored?.(r);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={score}
        disabled={loading}
        className="btn-ghost inline-flex items-center gap-1 text-sm"
      >
        {loading ? <Spinner /> : <Sparkles className="h-4 w-4" />}
        {loading ? t("scoring") : t("scoreThis")}
      </button>
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {result && <LeadScoreCard result={result} />}
    </div>
  );
}
