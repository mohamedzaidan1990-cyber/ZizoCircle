import { createHmac } from "node:crypto";
import { withTenant } from "../db/tenant";
import { Errors } from "../lib/errors";
import { buildInsert, rowsToCamel, rowToCamel } from "../lib/sql";

// Events the outbound webhook layer can deliver. Receiving CRMs subscribe by
// listing the events they care about in `events`.
export const PROPIFY_WEBHOOK_EVENTS = [
  "lead.qualified",
  "lead.updated",
  "lead.score_changed",
  "lead.opted_out",
  "campaign.message.replied",
] as const;
export type PropifyEvent = (typeof PROPIFY_WEBHOOK_EVENTS)[number];

export interface PropifyWebhook {
  id: string;
  name: string;
  url: string;
  events: PropifyEvent[];
  isActive: boolean;
  lastFiredAt: string | null;
  lastStatus: number | null;
  createdAt: string;
}

const WEBHOOK_INSERT_COLS = new Set<string>([
  "name",
  "url",
  "secret",
  "events",
  "isActive",
]);

export interface CreateWebhookInput {
  name: string;
  url: string;
  secret?: string | null;
  events?: PropifyEvent[];
}

export async function listWebhooks(
  slug: string,
): Promise<PropifyWebhook[]> {
  return withTenant(slug, async (client) => {
    const res = await client.query(
      `SELECT id, name, url, events, is_active, last_fired_at, last_status, created_at
         FROM propify_webhooks
        ORDER BY created_at DESC`,
    );
    return rowsToCamel<PropifyWebhook>(res.rows);
  });
}

export async function createWebhook(
  slug: string,
  input: CreateWebhookInput,
): Promise<PropifyWebhook> {
  // Light validation — keep the URL on https:// in prod; allow http only on
  // localhost for local dev/testing.
  if (!/^https:\/\//i.test(input.url) && !/^http:\/\/localhost(:\d+)?\b/i.test(input.url)) {
    throw Errors.validation("Webhook URL must be https:// (http:// is allowed only for localhost during testing)");
  }
  const events: PropifyEvent[] =
    input.events && input.events.length > 0
      ? input.events
      : ["lead.qualified"];
  for (const e of events) {
    if (!PROPIFY_WEBHOOK_EVENTS.includes(e)) {
      throw Errors.validation(`Unknown event: ${e}`);
    }
  }

  const data = {
    name: input.name,
    url: input.url,
    secret: input.secret ?? null,
    events,
    isActive: true,
  };
  const { columns, placeholders, values } = buildInsert(
    data,
    WEBHOOK_INSERT_COLS,
  );

  return withTenant(slug, async (client) => {
    const res = await client.query(
      `INSERT INTO propify_webhooks (${columns}) VALUES (${placeholders})
       RETURNING id, name, url, events, is_active, last_fired_at, last_status, created_at`,
      values,
    );
    return rowToCamel<PropifyWebhook>(res.rows[0]);
  });
}

export async function deleteWebhook(slug: string, id: string): Promise<void> {
  await withTenant(slug, async (client) => {
    const res = await client.query(
      `DELETE FROM propify_webhooks WHERE id = $1`,
      [id],
    );
    if (res.rowCount === 0) {
      throw Errors.notFound("Webhook not found");
    }
  });
}

// ── Delivery ────────────────────────────────────────────────────────────────

export interface PropifyWebhookPayload {
  event: PropifyEvent;
  timestamp: string;
  tenant: string;
  data: Record<string, unknown>;
}

interface WebhookRow {
  id: string;
  url: string;
  secret: string | null;
}

const DELIVERY_TIMEOUT_MS = 10_000;

function buildSignature(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

async function deliverOne(
  slug: string,
  webhook: WebhookRow,
  payload: PropifyWebhookPayload,
): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Propify-Event": payload.event,
    "X-Propify-Tenant": slug,
  };
  if (webhook.secret) {
    headers["X-Propify-Signature"] = buildSignature(webhook.secret, body);
  }

  let status = 0;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      status = res.status;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `[propify-webhook] delivery failed for ${webhook.url}: ${err instanceof Error ? err.message : String(err)}`,
    );
    status = 0;
  } finally {
    await withTenant(slug, (client) =>
      client.query(
        `UPDATE propify_webhooks
            SET last_fired_at = NOW(), last_status = $1
          WHERE id = $2`,
        [status, webhook.id],
      ),
    ).catch(() => undefined);
  }
}

/** Fans out an event to every webhook in the tenant that subscribes to it.
 *  Fire-and-forget from the caller's perspective: we never throw, never
 *  block the caller, and one failed receiver doesn't affect the others. */
export function firePropifyWebhooks(
  slug: string,
  event: PropifyEvent,
  data: Record<string, unknown>,
): void {
  // Don't await — webhook delivery should never delay the path that emitted
  // the event (lead ingest, opt-out write, etc.).
  void (async () => {
    try {
      const webhooks = await withTenant(slug, async (client) => {
        const res = await client.query<WebhookRow>(
          `SELECT id, url, secret
             FROM propify_webhooks
            WHERE is_active = TRUE AND $1 = ANY(events)`,
          [event],
        );
        return res.rows;
      });
      if (webhooks.length === 0) return;
      const payload: PropifyWebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        tenant: slug,
        data,
      };
      await Promise.all(
        webhooks.map((w) => deliverOne(slug, w, payload)),
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[propify-webhook] fan-out error:", err);
    }
  })();
}

/** Synthetic test payload for the dashboard's "test webhook" button. Returns
 *  after the delivery attempt completes so the UI can show last_status. */
export async function fireTestWebhook(
  slug: string,
  webhookId: string,
): Promise<{ status: number | null }> {
  const webhook = await withTenant(slug, async (client) => {
    const res = await client.query<WebhookRow>(
      `SELECT id, url, secret FROM propify_webhooks WHERE id = $1 AND is_active = TRUE`,
      [webhookId],
    );
    return res.rows[0] ?? null;
  });
  if (!webhook) throw Errors.notFound("Webhook not found or inactive");

  const payload: PropifyWebhookPayload = {
    event: "lead.qualified",
    timestamp: new Date().toISOString(),
    tenant: slug,
    data: {
      test: true,
      contact_id: "00000000-0000-0000-0000-000000000000",
      phone: "97450000000",
      property_ref: "TEST-001",
      property_name: "Test Property — Lusail Marina",
      score: 85,
      tier: "hot",
      qualifiers: { q1: true, q2: true, q3: true, q4: false, q5: true },
      summary: "Test lead from Propify webhook verification.",
      source: "property_finder",
      agent_id: null,
    },
  };

  await deliverOne(slug, webhook, payload);

  const after = await withTenant(slug, async (client) => {
    const res = await client.query<{ last_status: number | null }>(
      `SELECT last_status FROM propify_webhooks WHERE id = $1`,
      [webhookId],
    );
    return res.rows[0]?.last_status ?? null;
  });
  return { status: after };
}
