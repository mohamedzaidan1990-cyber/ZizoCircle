import { getTranslations } from "next-intl/server";
import { serverApiGet } from "@/lib/server-api";
import { IntegrationsBoard } from "@/components/integrations/IntegrationsBoard";

export interface WebhookSummary {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastFiredAt: string | null;
  lastStatus: number | null;
  createdAt: string;
}

export default async function IntegrationsPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "integrations",
  });

  let webhooks: WebhookSummary[] = [];
  let error: string | null = null;
  try {
    webhooks = await serverApiGet<WebhookSummary[]>("/api/propify/webhooks");
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load webhooks";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
      </div>

      {error ? (
        <div className="card p-6 text-sm text-red-700 bg-red-50 border-red-200">
          {error}
        </div>
      ) : (
        <IntegrationsBoard initial={webhooks} locale={params.locale} />
      )}
    </div>
  );
}
