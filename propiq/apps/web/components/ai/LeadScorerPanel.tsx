"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import type { Contact, LeadScoreResult, LeadTier } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

const TIER_BADGE: Record<LeadTier, string> = {
  HOT: "bg-emerald-100 text-emerald-700",
  WARM: "bg-amber-100 text-amber-700",
  COLD: "bg-slate-100 text-slate-600",
};

export function LeadScorerPanel() {
  const t = useTranslations("ai");
  const tCommon = useTranslations("common");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState<string>("");
  const [result, setResult] = useState<LeadScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/contacts", { params: { limit: 200 } })
      .then((res) => setContacts(unwrap<Contact[]>(res)))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const score = async () => {
    if (!contactId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post("/api/ai/lead-scorer/score", { contactId });
      setResult(unwrap<LeadScoreResult>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t("scorerHint")}</p>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <select
          className="input flex-1 min-w-[260px]"
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
        >
          <option value="">{t("selectContact")}</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {[c.firstName, c.lastName].filter(Boolean).join(" ")} · {c.phone}
            </option>
          ))}
        </select>
        <button
          onClick={score}
          disabled={!contactId || loading}
          className="btn-primary inline-flex items-center gap-1"
        >
          {loading ? <Spinner /> : <Sparkles className="h-4 w-4" />}
          {loading ? t("scoring") : t("scoreThis")}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && <LeadScoreCard result={result} />}
    </div>
  );
}

export function LeadScoreCard({ result }: { result: LeadScoreResult }) {
  const t = useTranslations("ai");
  const tContacts = useTranslations("contacts");
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-3xl font-bold text-slate-900">{result.score}</div>
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_BADGE[result.tier]}`}
        >
          {tContacts(`tier_${result.tier}`)}
        </span>
      </div>

      <div>
        <p className="label">{t("reason")}</p>
        <p className="text-sm text-slate-700">{result.reason}</p>
      </div>

      <div>
        <p className="label">{t("recommendedAction")}</p>
        <p className="text-sm text-slate-700">{result.recommendedAction}</p>
      </div>

      <div>
        <p className="label">{t("redFlags")}</p>
        {result.redFlags.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noFlags")}</p>
        ) : (
          <ul className="list-disc ms-5 text-sm text-rose-700 space-y-1">
            {result.redFlags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
