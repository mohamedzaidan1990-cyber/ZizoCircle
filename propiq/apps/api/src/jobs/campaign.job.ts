import { Worker, type Job } from "bullmq";
import {
  QUEUE_NAMES,
  redisConnection,
  registerWorker,
} from "../services/queue";
import { withTenant } from "../db/tenant";
import { env } from "../lib/env";

export interface CampaignJobData {
  tenantSlug: string;
  campaignId: string;
}

interface CampaignRow {
  id: string;
  template_name: string;
  template_lang: string;
  status: string;
}

interface MessageRow {
  id: string;
  phone: string;
  params: Record<string, string>;
}

// ── 360dialog send ──────────────────────────────────────────────────────────

interface SendResult {
  ok: true;
  wabaMsgId: string | null;
}
interface SendError {
  ok: false;
  error: string;
}

async function sendTemplateMessage(
  to: string,
  templateName: string,
  templateLang: string,
  params: Record<string, string>,
): Promise<SendResult | SendError> {
  if (!env.DIALOG360_API_KEY) {
    return { ok: false, error: "DIALOG360_API_KEY not configured" };
  }
  // Build the body component from the resolved params, ordered by placeholder
  // number ("1","2",…). Empty mapping = no body component.
  const ordered = Object.keys(params)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => ({ type: "text" as const, text: params[k] ?? "" }));
  const components =
    ordered.length > 0
      ? [{ type: "body" as const, parameters: ordered }]
      : [];

  try {
    const response = await fetch(`${env.DIALOG360_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "D360-API-KEY": env.DIALOG360_API_KEY,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components,
        },
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, error: `360dialog ${response.status}: ${body.slice(0, 300)}` };
    }
    const data = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
    };
    return { ok: true, wabaMsgId: data.messages?.[0]?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "send failed",
    };
  }
}

// ── Job runner ───────────────────────────────────────────────────────────────

async function runCampaign(data: CampaignJobData, log: (m: string) => void) {
  const { tenantSlug, campaignId } = data;

  // Move to RUNNING (idempotent — only fires the timestamp once).
  const campaign = await withTenant(tenantSlug, async (client) => {
    await client.query(
      `UPDATE propify_campaigns
         SET status = 'RUNNING',
             started_at = COALESCE(started_at, NOW()),
             updated_at = NOW()
       WHERE id = $1 AND status IN ('DRAFT','SCHEDULED','PAUSED')`,
      [campaignId],
    );
    const res = await client.query<CampaignRow>(
      `SELECT id, template_name, template_lang, status
         FROM propify_campaigns WHERE id = $1`,
      [campaignId],
    );
    return res.rows[0] ?? null;
  });
  if (!campaign) {
    log(`campaign ${campaignId} not found, aborting`);
    return;
  }
  if (campaign.status !== "RUNNING") {
    log(`campaign ${campaignId} status is ${campaign.status}, aborting`);
    return;
  }

  log(`sending campaign ${campaignId} (${campaign.template_name})`);

  // Process pending messages one at a time. Re-check pause status between
  // each send so a manual pause stops the run promptly.
  const PAGE_SIZE = 50;
  let sentCount = 0;
  let failedCount = 0;
  let optedOutCount = 0;

  while (true) {
    const { messages, paused } = await withTenant(tenantSlug, async (client) => {
      const status = await client.query<{ status: string }>(
        `SELECT status FROM propify_campaigns WHERE id = $1`,
        [campaignId],
      );
      const currentStatus = status.rows[0]?.status;
      if (currentStatus !== "RUNNING") {
        return { messages: [] as MessageRow[], paused: true };
      }
      const res = await client.query<MessageRow>(
        `SELECT id, phone, params
           FROM propify_campaign_messages
          WHERE campaign_id = $1 AND status = 'PENDING'
          ORDER BY created_at ASC
          LIMIT $2`,
        [campaignId, PAGE_SIZE],
      );
      return { messages: res.rows, paused: false };
    });

    if (paused) {
      log(`campaign ${campaignId} no longer RUNNING, stopping loop`);
      break;
    }
    if (messages.length === 0) break;

    for (const msg of messages) {
      // Always re-check opt-outs at send time — someone may have opted out
      // between campaign creation and send.
      const optoutCheck = await withTenant(tenantSlug, (client) =>
        client.query(`SELECT 1 FROM propify_optouts WHERE phone = $1`, [
          msg.phone,
        ]),
      );
      if ((optoutCheck.rowCount ?? 0) > 0) {
        await withTenant(tenantSlug, (client) =>
          client.query(
            `UPDATE propify_campaign_messages
                SET status = 'OPTED_OUT', error = 'on opt-out list at send time'
              WHERE id = $1`,
            [msg.id],
          ),
        );
        optedOutCount += 1;
        continue;
      }

      const result = await sendTemplateMessage(
        msg.phone,
        campaign.template_name,
        campaign.template_lang,
        msg.params || {},
      );

      if (result.ok) {
        await withTenant(tenantSlug, (client) =>
          client.query(
            `UPDATE propify_campaign_messages
                SET status = 'SENT', waba_msg_id = $1, sent_at = NOW()
              WHERE id = $2`,
            [result.wabaMsgId, msg.id],
          ),
        );
        sentCount += 1;
      } else {
        await withTenant(tenantSlug, (client) =>
          client.query(
            `UPDATE propify_campaign_messages
                SET status = 'FAILED', error = $1
              WHERE id = $2`,
            [result.error, msg.id],
          ),
        );
        failedCount += 1;
      }

      await new Promise((r) => setTimeout(r, env.CAMPAIGN_SEND_DELAY_MS));
    }
  }

  // Only flip to COMPLETED if still RUNNING (a manual pause in flight leaves
  // it PAUSED).
  await withTenant(tenantSlug, (client) =>
    client.query(
      `UPDATE propify_campaigns
          SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'RUNNING'`,
      [campaignId],
    ),
  );

  log(
    `campaign ${campaignId} done — sent ${sentCount}, failed ${failedCount}, opted-out ${optedOutCount}`,
  );
}

export function startCampaignWorker(): Worker {
  const worker = new Worker<CampaignJobData>(
    QUEUE_NAMES.propifyCampaigns,
    async (job: Job<CampaignJobData>) => {
      await runCampaign(job.data, (m) => {
        // eslint-disable-next-line no-console
        console.log(`[propify-campaign ${job.id}] ${m}`);
      });
    },
    {
      connection: redisConnection,
      // One concurrent campaign per worker keeps per-tenant rate limits clean
      // and avoids the 360dialog spec's "do not parallelise template sends to
      // the same number" guidance.
      concurrency: 1,
    },
  );

  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      `[propify-campaign ${job?.id ?? "?"}] failed:`,
      err.message,
    );
  });

  registerWorker(worker);
  return worker;
}
