import { getTranslations } from "next-intl/server";
import { serverApiGet } from "@/lib/server-api";
import { CampaignsBoard } from "@/components/campaigns/CampaignsBoard";

export interface CampaignWithStats {
  id: string;
  name: string;
  templateName: string;
  templateLang: string;
  templateParams: Array<{ key: string; value: string }>;
  status:
    | "DRAFT"
    | "SCHEDULED"
    | "RUNNING"
    | "PAUSED"
    | "COMPLETED"
    | "FAILED";
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
    optedOut: number;
  };
}

export default async function CampaignsPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "campaigns",
  });

  let campaigns: CampaignWithStats[] = [];
  let error: string | null = null;
  try {
    campaigns = await serverApiGet<CampaignWithStats[]>(
      "/api/propify/campaigns",
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load campaigns";
  }

  const totals = campaigns.reduce(
    (acc, c) => ({
      recipients: acc.recipients + c.stats.totalRecipients,
      sent: acc.sent + c.stats.sent,
      delivered: acc.delivered + c.stats.delivered,
      read: acc.read + c.stats.read,
      replied: acc.replied + c.stats.replied,
    }),
    { recipients: 0, sent: 0, delivered: 0, read: 0, replied: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={t("statCampaigns")} value={campaigns.length} />
        <Stat label={t("statRecipients")} value={totals.recipients} />
        <Stat label={t("statSent")} value={totals.sent} />
        <Stat label={t("statDelivered")} value={totals.delivered} />
        <Stat label={t("statReplied")} value={totals.replied} accent="warm" />
      </div>

      {error ? (
        <div className="card p-6 text-sm text-red-700 bg-red-50 border-red-200">
          {error}
        </div>
      ) : (
        <CampaignsBoard initial={campaigns} locale={params.locale} />
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
  accent?: "warm";
}) {
  const tone =
    accent === "warm" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${tone}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
