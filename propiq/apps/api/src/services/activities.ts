import { withTenant } from "../db/tenant";
import { Errors } from "../lib/errors";
import { buildInsert, rowsToCamel, rowToCamel } from "../lib/sql";

export type ActivityType =
  | "NOTE"
  | "CALL"
  | "EMAIL"
  | "WHATSAPP"
  | "SMS"
  | "MEETING"
  | "VIEWING"
  | "TASK"
  | "AI_CALL";

export type ActivityDirection = "INBOUND" | "OUTBOUND";

export interface Activity {
  id: string;
  activityType: ActivityType;
  direction: ActivityDirection | null;
  subject: string | null;
  body: string | null;
  status: string;
  scheduledAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  callRecordingUrl: string | null;
  callTranscript: string | null;
  callSummary: string | null;
  callOutcome: string | null;
  contactId: string | null;
  dealId: string | null;
  propertyId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ListActivitiesParams {
  contactId?: string;
  dealId?: string;
  propertyId?: string;
  page?: number;
  limit?: number;
}

const ACTIVITY_INSERT_COLS = new Set<string>([
  "activityType",
  "direction",
  "subject",
  "body",
  "status",
  "scheduledAt",
  "completedAt",
  "durationSeconds",
  "contactId",
  "dealId",
  "propertyId",
  "createdBy",
]);

export interface CreateActivityInput {
  activityType: ActivityType;
  direction?: ActivityDirection | null;
  subject?: string | null;
  body?: string | null;
  status?: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  durationSeconds?: number | null;
  contactId?: string | null;
  dealId?: string | null;
  propertyId?: string | null;
  createdBy: string;
}

export async function listActivities(
  slug: string,
  params: ListActivitiesParams,
): Promise<{ items: Activity[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const offset = (page - 1) * limit;

  const filters: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (params.contactId) {
    filters.push(`contact_id = $${i++}`);
    values.push(params.contactId);
  }
  if (params.dealId) {
    filters.push(`deal_id = $${i++}`);
    values.push(params.dealId);
  }
  if (params.propertyId) {
    filters.push(`property_id = $${i++}`);
    values.push(params.propertyId);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  return withTenant(slug, async (client) => {
    const totalRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM activities ${where}`,
      values,
    );
    const itemsRes = await client.query(
      `SELECT * FROM activities ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset],
    );
    return {
      items: rowsToCamel<Activity>(itemsRes.rows),
      total: totalRes.rows[0]?.count ?? 0,
      page,
      limit,
    };
  });
}

export async function createActivity(
  slug: string,
  input: CreateActivityInput,
): Promise<Activity> {
  const data = {
    activityType: input.activityType,
    direction: input.direction ?? null,
    subject: input.subject ?? null,
    body: input.body ?? null,
    status: input.status ?? "COMPLETED",
    scheduledAt: input.scheduledAt ?? null,
    completedAt: input.completedAt ?? new Date().toISOString(),
    durationSeconds: input.durationSeconds ?? null,
    contactId: input.contactId ?? null,
    dealId: input.dealId ?? null,
    propertyId: input.propertyId ?? null,
    createdBy: input.createdBy,
  };
  const { columns, placeholders, values } = buildInsert(data, ACTIVITY_INSERT_COLS);
  const result = await withTenant(slug, (client) =>
    client.query(
      `INSERT INTO activities (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    ),
  );
  return rowToCamel<Activity>(result.rows[0]);
}

export async function deleteActivity(slug: string, id: string): Promise<void> {
  const result = await withTenant(slug, (client) =>
    client.query(`DELETE FROM activities WHERE id = $1`, [id]),
  );
  if (result.rowCount === 0) throw Errors.notFound("Activity not found");
}
