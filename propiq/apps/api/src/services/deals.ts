import type { Deal, DealStage, DealType, PipelineType } from "@propiq/shared";
import { DEAL_STAGES } from "@propiq/shared";
import { withTenant } from "../db/tenant";
import { Errors } from "../lib/errors";
import { buildInsert, buildUpdate, rowsToCamel, rowToCamel } from "../lib/sql";

export interface ListDealsParams {
  search?: string;
  stage?: DealStage;
  pipelineType?: PipelineType;
  contactId?: string;
  propertyId?: string;
  page?: number;
  limit?: number;
}

const DEAL_INSERT_COLS = new Set<string>([
  "title",
  "dealType",
  "pipelineType",
  "stage",
  "value",
  "commissionRate",
  "commissionValue",
  "currency",
  "probability",
  "expectedClose",
  "contactId",
  "propertyId",
  "assignedTo",
  "notes",
]);

const DEAL_UPDATE_COLS = new Set<string>([
  ...DEAL_INSERT_COLS,
  "closedAt",
  "lostReason",
  "priority",
  "source",
  "aiNextAction",
  "aiRiskFlags",
  "updatedAt",
]);

export interface CreateDealInput {
  title: string;
  dealType?: DealType;
  pipelineType?: PipelineType;
  stage?: DealStage;
  value?: number | null;
  commissionRate?: number;
  commissionValue?: number | null;
  currency?: string;
  probability?: number;
  expectedClose?: string | null;
  contactId?: string | null;
  propertyId?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
}

export type UpdateDealInput = Partial<CreateDealInput> & {
  closedAt?: string | null;
  lostReason?: string | null;
};

export async function listDeals(
  slug: string,
  params: ListDealsParams,
): Promise<{ items: Deal[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(500, Math.max(1, params.limit ?? 200));
  const offset = (page - 1) * limit;

  const filters: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (params.stage) {
    filters.push(`stage = $${i++}`);
    values.push(params.stage);
  }
  if (params.pipelineType) {
    filters.push(`pipeline_type = $${i++}`);
    values.push(params.pipelineType);
  }
  if (params.contactId) {
    filters.push(`contact_id = $${i++}`);
    values.push(params.contactId);
  }
  if (params.propertyId) {
    filters.push(`property_id = $${i++}`);
    values.push(params.propertyId);
  }
  if (params.search && params.search.trim()) {
    filters.push(`title ILIKE $${i}`);
    values.push(`%${params.search.trim()}%`);
    i += 1;
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  return withTenant(slug, async (client) => {
    const totalRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM deals ${where}`,
      values,
    );
    const itemsRes = await client.query(
      `SELECT * FROM deals ${where} ORDER BY updated_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset],
    );
    return {
      items: rowsToCamel<Deal>(itemsRes.rows),
      total: totalRes.rows[0]?.count ?? 0,
      page,
      limit,
    };
  });
}

export async function getDeal(slug: string, id: string): Promise<Deal> {
  const result = await withTenant(slug, (client) =>
    client.query(`SELECT * FROM deals WHERE id = $1`, [id]),
  );
  if (!result.rows[0]) throw Errors.notFound("Deal not found");
  return rowToCamel<Deal>(result.rows[0]);
}

export async function createDeal(
  slug: string,
  input: CreateDealInput,
): Promise<Deal> {
  const data = {
    title: input.title,
    dealType: input.dealType ?? "SALE",
    pipelineType:
      input.pipelineType ?? (input.dealType === "RENT" ? "LEASE" : "SALES"),
    stage: input.stage ?? "NEW_LEAD",
    value: input.value ?? null,
    commissionRate: input.commissionRate ?? 0.02,
    commissionValue: input.commissionValue ?? null,
    currency: input.currency ?? "QAR",
    probability: input.probability ?? 20,
    expectedClose: input.expectedClose ?? null,
    contactId: input.contactId ?? null,
    propertyId: input.propertyId ?? null,
    assignedTo: input.assignedTo ?? null,
    notes: input.notes ?? null,
  };
  const { columns, placeholders, values } = buildInsert(data, DEAL_INSERT_COLS);
  const result = await withTenant(slug, (client) =>
    client.query(
      `INSERT INTO deals (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    ),
  );
  return rowToCamel<Deal>(result.rows[0]);
}

export async function updateDeal(
  slug: string,
  id: string,
  input: UpdateDealInput,
): Promise<Deal> {
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    normalized[k] = v;
  }
  if (Object.keys(normalized).length === 0) {
    return getDeal(slug, id);
  }

  // Auto-set closed_at when entering a CLOSED_* stage.
  if (
    typeof normalized.stage === "string" &&
    (normalized.stage === "CLOSED_WON" || normalized.stage === "CLOSED_LOST") &&
    normalized.closedAt === undefined
  ) {
    normalized.closedAt = new Date().toISOString();
  }
  normalized.updatedAt = new Date();

  const { clause, values } = buildUpdate(normalized, DEAL_UPDATE_COLS);
  const result = await withTenant(slug, (client) =>
    client.query(
      `UPDATE deals SET ${clause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    ),
  );
  if (!result.rows[0]) throw Errors.notFound("Deal not found");
  return rowToCamel<Deal>(result.rows[0]);
}

export async function deleteDeal(slug: string, id: string): Promise<void> {
  const result = await withTenant(slug, (client) =>
    client.query(`DELETE FROM deals WHERE id = $1`, [id]),
  );
  if (result.rowCount === 0) throw Errors.notFound("Deal not found");
}

export interface PipelineStageGroup {
  stage: DealStage;
  deals: Deal[];
  count: number;
  totalValue: number;
}

export async function getPipeline(
  slug: string,
  pipelineType?: PipelineType,
): Promise<PipelineStageGroup[]> {
  const filters: string[] = ["stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')"];
  const values: unknown[] = [];
  if (pipelineType) {
    filters.push(`pipeline_type = $1`);
    values.push(pipelineType);
  }
  const where = `WHERE ${filters.join(" AND ")}`;

  const result = await withTenant(slug, (client) =>
    client.query(
      `SELECT * FROM deals ${where} ORDER BY updated_at DESC`,
      values,
    ),
  );
  const allDeals = rowsToCamel<Deal>(result.rows);

  const openStages: DealStage[] = DEAL_STAGES.filter(
    (s) => s !== "CLOSED_WON" && s !== "CLOSED_LOST",
  );

  return openStages.map((stage) => {
    const deals = allDeals.filter((d) => d.stage === stage);
    return {
      stage,
      deals,
      count: deals.length,
      totalValue: deals.reduce((sum, d) => sum + (d.value ?? 0), 0),
    };
  });
}
