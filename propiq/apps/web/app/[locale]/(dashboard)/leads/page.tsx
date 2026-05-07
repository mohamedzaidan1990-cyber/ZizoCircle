import { getTranslations } from "next-intl/server";
import { serverApiGet } from "@/lib/server-api";
import { LeadsFilters } from "@/components/leads/LeadsFilters";
import { LeadsBoard, type Lead, type Tier } from "@/components/leads/LeadsBoard";

const VALID_TIERS: Tier[] = ["hot", "warm", "cold", "dead"];

interface LeadsResponse {
  leads: Lead[];
  counts: Record<Tier, number>;
}

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { tier?: string };
}) {
  const t = await getTranslations({ locale: params.locale, namespace: "leads" });

  const tier =
    searchParams.tier && (VALID_TIERS as string[]).includes(searchParams.tier)
      ? (searchParams.tier as Tier)
      : undefined;

  let data: LeadsResponse = { leads: [], counts: { hot: 0, warm: 0, cold: 0, dead: 0 } };
  let error: string | null = null;

  try {
    data = await serverApiGet<LeadsResponse>(
      `/api/propify/leads${tier ? `?tier=${tier}` : ""}`,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load leads";
  }

  const total = data.leads.length;
  const avgScore =
    total > 0
      ? Math.round(
          data.leads.reduce((sum, l) => sum + (l.ai_score ?? 0), 0) / total,
        )
      : 0;
  const pendingAction = data.leads.filter((l) => l.propify_status === "NEW").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
        </div>
        <LeadsFilters
          locale={params.locale}
          activeTier={tier}
          counts={data.counts}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("statTotal")} value={total} />
        <Stat label={t("statHot")} value={data.counts.hot} accent="hot" />
        <Stat label={t("statAvg")} value={avgScore} />
        <Stat label={t("statPending")} value={pendingAction} accent="warm" />
      </div>

      {error ? (
        <div className="card p-6 text-sm text-red-700 bg-red-50 border-red-200">
          {error}
        </div>
      ) : (
        <LeadsBoard leads={data.leads} locale={params.locale} />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "hot" | "warm";
}) {
  const tone =
    accent === "hot"
      ? "text-red-600"
      : accent === "warm"
        ? "text-amber-600"
        : "text-slate-900";
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}
