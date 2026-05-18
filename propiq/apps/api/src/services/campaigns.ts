import { parse as parseCsv } from "csv-parse/sync";
import { z } from "zod";
import { withTenant } from "../db/tenant";
import { Errors } from "../lib/errors";
import { buildInsert, buildUpdate, rowsToCamel, rowToCamel } from "../lib/sql";
import { getQueue, QUEUE_NAMES } from "./queue";

// ── Types ────────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED";

export type CampaignMessageStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "REPLIED"
  | "FAILED"
  | "OPTED_OUT";

/** Each entry maps a WhatsApp template placeholder (e.g. "1" for {{1}}) to
 *  either a contact field name (resolved per-recipient) or a static string. */
export interface TemplateParamMapping {
  key: string;
  value: string;
}

export interface Campaign {
  id: string;
  name: string;
  templateName: string;
  templateLang: string;
  templateParams: TemplateParamMapping[];
  status: CampaignStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats {
  totalRecipients: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  optedOut: number;
}

export type CampaignWithStats = Campaign & { stats: CampaignStats };

const CAMPAIGN_INSERT_COLS = new Set<string>([
  "name",
  "templateName",
  "templateLang",
  "templateParams",
  "status",
  "scheduledAt",
  "createdBy",
]);

const CAMPAIGN_UPDATE_COLS = new Set<string>([
  "name",
  "templateName",
  "templateLang",
  "templateParams",
  "status",
  "scheduledAt",
  "startedAt",
  "completedAt",
  "updatedAt",
]);

// ── Recipient parsing ────────────────────────────────────────────────────────

export interface RecipientInput {
  phone: string;
  contactId?: string | null;
  fields: Record<string, string>;
}

const phoneSchema = z
  .string()
  .min(3)
  .max(30)
  .transform((s) => s.replace(/\D/g, ""))
  .refine((s) => s.length >= 5 && s.length <= 20, {
    message: "phone must contain 5–20 digits",
  });

const csvRowSchema = z
  .object({
    phone: phoneSchema,
  })
  .passthrough();

/** Parses an uploaded CSV buffer into typed recipient rows. Returns valid
 * rows plus per-row errors (so the agent can fix bad rows without losing
 * the rest). The `phone` column is required; everything else is opaque
 * data forwarded into the template-variable resolver. */
export function parseRecipientsCsv(
  csv: string | Buffer,
): { recipients: RecipientInput[]; errors: Array<{ row: number; reason: string }> } {
  const records = parseCsv(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  const recipients: RecipientInput[] = [];
  const errors: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < records.length; i += 1) {
    const row = records[i];
    if (!row) continue;
    const rowNum = i + 2;
    const parsed = csvRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({
        row: rowNum,
        reason: parsed.error.issues
          .map((iss) => `${iss.path.join(".") || "row"}: ${iss.message}`)
          .join("; "),
      });
      continue;
    }
    // Build the fields map as strings (other columns will be used to fill
    // template placeholders).
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      fields[k] = v == null ? "" : String(v);
    }
    fields.phone = parsed.data.phone; // overwrite with sanitised phone
    recipients.push({ phone: parsed.data.phone, fields });
  }

  return { recipients, errors };
}

// ── Public service surface ───────────────────────────────────────────────────

export interface CreateCampaignInput {
  name: string;
  templateName: string;
  templateLang?: string;
  templateParams?: TemplateParamMapping[];
  scheduledAt?: string | null;
  createdBy?: string | null;
}

export interface CreateCampaignResult {
  campaignId: string;
  totalRecipients: number;
  optedOut: number;
  queued: boolean;
}

/** Resolves a template param mapping against a recipient's fields. */
function resolveParamsForRecipient(
  mapping: TemplateParamMapping[],
  fields: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of mapping) {
    out[p.key] = fields[p.value] ?? p.value;
  }
  return out;
}

export async function createCampaign(
  slug: string,
  input: CreateCampaignInput,
  recipients: RecipientInput[],
): Promise<CreateCampaignResult> {
  if (recipients.length === 0) {
    throw Errors.validation("At least one recipient is required");
  }
  if (recipients.length > 5000) {
    throw Errors.validation("Bulk campaigns capped at 5000 recipients");
  }

  const data = {
    name: input.name,
    templateName: input.templateName,
    templateLang: input.templateLang ?? "en",
    templateParams: JSON.stringify(input.templateParams ?? []),
    status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
    scheduledAt: input.scheduledAt ?? null,
    createdBy: input.createdBy ?? null,
  };
  const { columns, placeholders, values } = buildInsert(
    data,
    CAMPAIGN_INSERT_COLS,
  );

  return withTenant(slug, async (client) => {
    // Filter recipients against the opt-out registry in-DB so the data plane
    // is the source of truth.
    const phones = recipients.map((r) => r.phone);
    const optoutsRes = await client.query(
      `SELECT phone FROM propify_optouts WHERE phone = ANY($1::text[])`,
      [phones],
    );
    const optoutSet = new Set<string>(optoutsRes.rows.map((r) => r.phone));
    const filtered = recipients.filter((r) => !optoutSet.has(r.phone));
    const optedOutCount = recipients.length - filtered.length;

    if (filtered.length === 0) {
      throw Errors.validation(
        "Every recipient is on the opt-out list — no messages to queue",
      );
    }

    const inserted = await client.query(
      `INSERT INTO propify_campaigns (${columns}) VALUES (${placeholders}) RETURNING id`,
      values,
    );
    const campaignId = inserted.rows[0].id as string;

    // Bulk insert message rows via jsonb_to_recordset to avoid N round trips.
    const messageRows = filtered.map((r) => ({
      contact_id: r.contactId ?? null,
      phone: r.phone,
      params: resolveParamsForRecipient(
        input.templateParams ?? [],
        r.fields,
      ),
    }));
    await client.query(
      `INSERT INTO propify_campaign_messages (campaign_id, contact_id, phone, params)
       SELECT $1, contact_id, phone, params
       FROM jsonb_to_recordset($2::jsonb)
         AS r(contact_id uuid, phone varchar, params jsonb)`,
      [campaignId, JSON.stringify(messageRows)],
    );

    // If no schedule was set, queue immediately.
    const queued = !input.scheduledAt;
    if (queued) {
      await getQueue(QUEUE_NAMES.propifyCampaigns).add(
        "send-campaign",
        { tenantSlug: slug, campaignId },
        { removeOnComplete: 100, removeOnFail: 100 },
      );
    }

    return {
      campaignId,
      totalRecipients: filtered.length,
      optedOut: optedOutCount,
      queued,
    };
  });
}

export async function listCampaigns(
  slug: string,
): Promise<CampaignWithStats[]> {
  return withTenant(slug, async (client) => {
    const res = await client.query(
      `SELECT
         c.*,
         COUNT(m.id)::int                                         AS total_recipients,
         COUNT(m.id) FILTER (WHERE m.status = 'SENT')::int        AS sent,
         COUNT(m.id) FILTER (WHERE m.status = 'DELIVERED')::int   AS delivered,
         COUNT(m.id) FILTER (WHERE m.status = 'READ')::int        AS read_count,
         COUNT(m.id) FILTER (WHERE m.status = 'REPLIED')::int     AS replied,
         COUNT(m.id) FILTER (WHERE m.status = 'FAILED')::int      AS failed,
         COUNT(m.id) FILTER (WHERE m.status = 'OPTED_OUT')::int   AS opted_out
       FROM propify_campaigns c
       LEFT JOIN propify_campaign_messages m ON m.campaign_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
    );
    return res.rows.map((r) => ({
      ...rowToCamel<Campaign>({
        id: r.id,
        name: r.name,
        template_name: r.template_name,
        template_lang: r.template_lang,
        template_params: r.template_params,
        status: r.status,
        scheduled_at: r.scheduled_at,
        started_at: r.started_at,
        completed_at: r.completed_at,
        created_by: r.created_by,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }),
      stats: {
        totalRecipients: r.total_recipients ?? 0,
        sent: r.sent ?? 0,
        delivered: r.delivered ?? 0,
        read: r.read_count ?? 0,
        replied: r.replied ?? 0,
        failed: r.failed ?? 0,
        optedOut: r.opted_out ?? 0,
      },
    }));
  });
}

export async function getCampaign(slug: string, id: string): Promise<Campaign> {
  return withTenant(slug, async (client) => {
    const res = await client.query(
      `SELECT * FROM propify_campaigns WHERE id = $1`,
      [id],
    );
    if (!res.rows[0]) throw Errors.notFound("Campaign not found");
    return rowToCamel<Campaign>(res.rows[0]);
  });
}

export async function setCampaignStatus(
  slug: string,
  id: string,
  status: CampaignStatus,
): Promise<Campaign> {
  const fields: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (status === "COMPLETED" || status === "FAILED") {
    fields.completedAt = new Date().toISOString();
  } else if (status === "RUNNING") {
    fields.startedAt = new Date().toISOString();
  }
  const { clause, values } = buildUpdate(fields, CAMPAIGN_UPDATE_COLS);
  return withTenant(slug, async (client) => {
    const res = await client.query(
      `UPDATE propify_campaigns SET ${clause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    if (!res.rows[0]) throw Errors.notFound("Campaign not found");
    return rowToCamel<Campaign>(res.rows[0]);
  });
}

export async function pauseCampaign(slug: string, id: string): Promise<Campaign> {
  return setCampaignStatus(slug, id, "PAUSED");
}

export async function resumeCampaign(slug: string, id: string): Promise<Campaign> {
  const updated = await setCampaignStatus(slug, id, "RUNNING");
  await getQueue(QUEUE_NAMES.propifyCampaigns).add(
    "send-campaign",
    { tenantSlug: slug, campaignId: id },
    { removeOnComplete: 100, removeOnFail: 100 },
  );
  return updated;
}

export async function enqueueCampaignSend(
  slug: string,
  id: string,
): Promise<void> {
  // Validate it exists + isn't already terminal.
  const campaign = await getCampaign(slug, id);
  if (
    campaign.status === "RUNNING" ||
    campaign.status === "COMPLETED" ||
    campaign.status === "FAILED"
  ) {
    throw Errors.validation(
      `Cannot send a campaign in status ${campaign.status}`,
    );
  }
  await getQueue(QUEUE_NAMES.propifyCampaigns).add(
    "send-campaign",
    { tenantSlug: slug, campaignId: id },
    { removeOnComplete: 100, removeOnFail: 100 },
  );
}

// ── Opt-out registry ─────────────────────────────────────────────────────────

export async function recordOptOut(
  slug: string,
  phone: string,
  reason?: string,
): Promise<{ phone: string; alreadyOptedOut: boolean }> {
  const normalised = phone.replace(/\D/g, "");
  if (normalised.length < 5) {
    throw Errors.validation("phone is too short to opt out");
  }
  return withTenant(slug, async (client) => {
    const res = await client.query(
      `INSERT INTO propify_optouts (phone, reason)
       VALUES ($1, $2)
       ON CONFLICT (phone) DO NOTHING
       RETURNING phone`,
      [normalised, reason ?? null],
    );
    return { phone: normalised, alreadyOptedOut: res.rowCount === 0 };
  });
}

export async function isOptedOut(slug: string, phone: string): Promise<boolean> {
  const normalised = phone.replace(/\D/g, "");
  return withTenant(slug, async (client) => {
    const res = await client.query(
      `SELECT 1 FROM propify_optouts WHERE phone = $1`,
      [normalised],
    );
    return (res.rowCount ?? 0) > 0;
  });
}

export async function listOptOuts(slug: string): Promise<string[]> {
  return withTenant(slug, async (client) => {
    const res = await client.query(
      `SELECT phone FROM propify_optouts ORDER BY opted_out_at DESC`,
    );
    return res.rows.map((r) => r.phone as string);
  });
}

// ── Detection ────────────────────────────────────────────────────────────────

const OPTOUT_KEYWORDS = [
  "stop",
  "unsubscribe",
  "opt out",
  "optout",
  "إيقاف",
  "لا شكرا",
  "توقف",
  "إلغاء الاشتراك",
];

export function looksLikeOptOut(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return OPTOUT_KEYWORDS.some((k) => lower.includes(k));
}
