import { parse as parseCsv } from "csv-parse/sync";
import { stringify as stringifyCsv } from "csv-stringify/sync";
import type {
  Contact,
  ContactType,
  LeadStatus,
  PipelineType,
} from "@propiq/shared";
import { withTenant } from "../db/tenant";
import { Errors } from "../lib/errors";
import { buildInsert, buildUpdate, rowsToCamel, rowToCamel } from "../lib/sql";

const CONTACT_TYPES: ContactType[] = [
  "BUYER",
  "SELLER",
  "TENANT",
  "LANDLORD",
  "INVESTOR",
];

export interface ListContactsParams {
  search?: string;
  contactType?: ContactType;
  pipelineType?: PipelineType;
  status?: LeadStatus;
  isArchived?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateContactInput {
  firstName: string;
  lastName?: string | null;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  email?: string | null;
  phone: string;
  phoneAlt?: string | null;
  nationality?: string | null;
  contactType?: ContactType;
  pipelineType?: PipelineType;
  source?: string | null;
  sourceDetail?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  preferredAreas?: string[];
  bedroomsMin?: number | null;
  bedroomsMax?: number | null;
  propertyTypes?: string[];
  notes?: string | null;
  assignedTo?: string | null;
}

export type UpdateContactInput = Partial<CreateContactInput> & {
  isArchived?: boolean;
};

// CASE expression that produces the lead status. Joined as `c` and `_d`/`_a` aliases.
const STATUS_CASE = `
  CASE
    WHEN c.is_archived THEN 'LOST'
    WHEN COALESCE(_d.won_count, 0) > 0 THEN 'WON'
    WHEN COALESCE(_d.open_count, 0) = 0 AND COALESCE(_d.lost_count, 0) > 0 THEN 'LOST'
    WHEN COALESCE(_a.last_activity_at, c.created_at) < NOW() - INTERVAL '30 days' THEN 'DEAD'
    ELSE 'ACTIVE'
  END
`;

const TIER_CASE = `
  CASE
    WHEN c.ai_score >= 80 THEN 'HOT'
    WHEN c.ai_score >= 50 THEN 'WARM'
    ELSE 'COLD'
  END
`;

const SELECT_WITH_DERIVED = `
  SELECT
    c.*,
    _a.last_activity_at,
    ${TIER_CASE} AS tier,
    ${STATUS_CASE} AS status
  FROM contacts c
  LEFT JOIN (
    SELECT contact_id, MAX(COALESCE(completed_at, created_at)) AS last_activity_at
    FROM activities
    WHERE contact_id IS NOT NULL
    GROUP BY contact_id
  ) _a ON _a.contact_id = c.id
  LEFT JOIN (
    SELECT
      contact_id,
      COUNT(*) FILTER (WHERE stage = 'CLOSED_WON')::int  AS won_count,
      COUNT(*) FILTER (WHERE stage = 'CLOSED_LOST')::int AS lost_count,
      COUNT(*) FILTER (WHERE stage NOT IN ('CLOSED_WON', 'CLOSED_LOST'))::int AS open_count
    FROM deals
    WHERE contact_id IS NOT NULL
    GROUP BY contact_id
  ) _d ON _d.contact_id = c.id
`;

export async function listContacts(
  slug: string,
  params: ListContactsParams,
): Promise<{ items: Contact[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(200, Math.max(1, params.limit ?? 50));
  const offset = (page - 1) * limit;

  const filters: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (params.isArchived === undefined) {
    filters.push(`c.is_archived = false`);
  } else {
    filters.push(`c.is_archived = $${i++}`);
    values.push(params.isArchived);
  }
  if (params.contactType) {
    filters.push(`c.contact_type = $${i++}`);
    values.push(params.contactType);
  }
  if (params.pipelineType) {
    filters.push(`c.pipeline_type = $${i++}`);
    values.push(params.pipelineType);
  }
  if (params.status) {
    filters.push(`(${STATUS_CASE}) = $${i++}`);
    values.push(params.status);
  }
  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    filters.push(
      `(c.first_name ILIKE $${i} OR c.last_name ILIKE $${i} OR c.email ILIKE $${i} OR c.phone ILIKE $${i})`,
    );
    values.push(term);
    i += 1;
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  return withTenant(slug, async (client) => {
    // Count uses the same joins so the status filter has access to _a/_d.
    const countSql = `
      SELECT COUNT(*)::int AS count
      FROM contacts c
      LEFT JOIN (
        SELECT contact_id, MAX(COALESCE(completed_at, created_at)) AS last_activity_at
        FROM activities WHERE contact_id IS NOT NULL GROUP BY contact_id
      ) _a ON _a.contact_id = c.id
      LEFT JOIN (
        SELECT contact_id,
          COUNT(*) FILTER (WHERE stage = 'CLOSED_WON')::int  AS won_count,
          COUNT(*) FILTER (WHERE stage = 'CLOSED_LOST')::int AS lost_count,
          COUNT(*) FILTER (WHERE stage NOT IN ('CLOSED_WON', 'CLOSED_LOST'))::int AS open_count
        FROM deals WHERE contact_id IS NOT NULL GROUP BY contact_id
      ) _d ON _d.contact_id = c.id
      ${where}
    `;
    const totalRes = await client.query(countSql, values);

    const itemsSql = `
      ${SELECT_WITH_DERIVED}
      ${where}
      ORDER BY c.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;
    const itemsRes = await client.query(itemsSql, [...values, limit, offset]);

    return {
      items: rowsToCamel<Contact>(itemsRes.rows),
      total: totalRes.rows[0]?.count ?? 0,
      page,
      limit,
    };
  });
}

export async function getContact(
  slug: string,
  id: string,
): Promise<Contact> {
  const result = await withTenant(slug, (client) =>
    client.query(
      `${SELECT_WITH_DERIVED} WHERE c.id = $1`,
      [id],
    ),
  );
  if (!result.rows[0]) throw Errors.notFound("Contact not found");
  return rowToCamel<Contact>(result.rows[0]);
}

export async function createContact(
  slug: string,
  input: CreateContactInput,
): Promise<Contact> {
  const data = {
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    firstNameAr: input.firstNameAr ?? null,
    lastNameAr: input.lastNameAr ?? null,
    email: input.email ? input.email.toLowerCase() : null,
    phone: input.phone,
    phoneAlt: input.phoneAlt ?? null,
    nationality: input.nationality ?? null,
    contactType: input.contactType ?? "BUYER",
    pipelineType:
      input.pipelineType ??
      (input.contactType === "TENANT" || input.contactType === "LANDLORD"
        ? "LEASE"
        : "SALES"),
    source: input.source ?? null,
    sourceDetail: input.sourceDetail ?? null,
    budgetMin: input.budgetMin ?? null,
    budgetMax: input.budgetMax ?? null,
    currency: input.currency ?? "QAR",
    preferredAreas: input.preferredAreas ?? [],
    bedroomsMin: input.bedroomsMin ?? null,
    bedroomsMax: input.bedroomsMax ?? null,
    propertyTypes: input.propertyTypes ?? [],
    notes: input.notes ?? null,
    assignedTo: input.assignedTo ?? null,
  };
  const { columns, placeholders, values } = buildInsert(data);
  const inserted = await withTenant(slug, (client) =>
    client.query(
      `INSERT INTO contacts (${columns}) VALUES (${placeholders}) RETURNING id`,
      values,
    ),
  );
  return getContact(slug, inserted.rows[0].id);
}

export async function updateContact(
  slug: string,
  id: string,
  input: UpdateContactInput,
): Promise<Contact> {
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    normalized[k] = k === "email" && typeof v === "string" ? v.toLowerCase() : v;
  }
  if (Object.keys(normalized).length === 0) {
    return getContact(slug, id);
  }
  normalized.updatedAt = new Date();

  const { clause, values } = buildUpdate(normalized);
  const updated = await withTenant(slug, (client) =>
    client.query(
      `UPDATE contacts SET ${clause} WHERE id = $${values.length + 1} RETURNING id`,
      [...values, id],
    ),
  );
  if (!updated.rows[0]) throw Errors.notFound("Contact not found");
  return getContact(slug, id);
}

export async function deleteContact(slug: string, id: string): Promise<void> {
  const result = await withTenant(slug, (client) =>
    client.query(`DELETE FROM contacts WHERE id = $1`, [id]),
  );
  if (result.rowCount === 0) throw Errors.notFound("Contact not found");
}

// ── CSV import/export ───────────────────────────────────────────────────────

const CSV_COLUMNS = [
  "first_name",
  "last_name",
  "first_name_ar",
  "last_name_ar",
  "email",
  "phone",
  "phone_alt",
  "nationality",
  "contact_type",
  "pipeline_type",
  "source",
  "source_detail",
  "budget_min",
  "budget_max",
  "currency",
  "preferred_areas",
  "bedrooms_min",
  "bedrooms_max",
  "property_types",
  "notes",
] as const;

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

function parseList(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseInt64(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeContactType(value: unknown): ContactType {
  if (typeof value !== "string") return "BUYER";
  const upper = value.trim().toUpperCase();
  return (CONTACT_TYPES as readonly string[]).includes(upper)
    ? (upper as ContactType)
    : "BUYER";
}

function normalizePipelineType(value: unknown): PipelineType | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.trim().toUpperCase();
  return upper === "SALES" || upper === "LEASE"
    ? (upper as PipelineType)
    : undefined;
}

export async function importContactsCsv(
  slug: string,
  csv: string | Buffer,
): Promise<CsvImportResult> {
  const records = parseCsv(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  const result: CsvImportResult = { imported: 0, skipped: 0, errors: [] };

  for (let idx = 0; idx < records.length; idx += 1) {
    const row = records[idx];
    if (!row) continue;
    const rowNum = idx + 2;
    const firstName = String(row.first_name ?? "").trim();
    const phone = String(row.phone ?? "").trim();
    if (!firstName || !phone) {
      result.skipped += 1;
      result.errors.push({
        row: rowNum,
        reason: "Missing required first_name or phone",
      });
      continue;
    }
    try {
      await createContact(slug, {
        firstName,
        lastName: row.last_name ? String(row.last_name) : null,
        firstNameAr: row.first_name_ar ? String(row.first_name_ar) : null,
        lastNameAr: row.last_name_ar ? String(row.last_name_ar) : null,
        email: row.email ? String(row.email) : null,
        phone,
        phoneAlt: row.phone_alt ? String(row.phone_alt) : null,
        nationality: row.nationality ? String(row.nationality) : null,
        contactType: normalizeContactType(row.contact_type),
        pipelineType: normalizePipelineType(row.pipeline_type),
        source: row.source ? String(row.source) : null,
        sourceDetail: row.source_detail ? String(row.source_detail) : null,
        budgetMin: parseInt64(row.budget_min),
        budgetMax: parseInt64(row.budget_max),
        currency: row.currency ? String(row.currency) : "QAR",
        preferredAreas: parseList(row.preferred_areas),
        bedroomsMin: parseInt64(row.bedrooms_min),
        bedroomsMax: parseInt64(row.bedrooms_max),
        propertyTypes: parseList(row.property_types),
        notes: row.notes ? String(row.notes) : null,
      });
      result.imported += 1;
    } catch (err) {
      result.skipped += 1;
      result.errors.push({
        row: rowNum,
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
  return result;
}

export async function exportContactsCsv(slug: string): Promise<string> {
  const contacts = await withTenant(slug, (client) =>
    client.query(
      `SELECT * FROM contacts WHERE is_archived = false ORDER BY created_at DESC`,
    ),
  );
  const rows = contacts.rows.map((r) => ({
    first_name: r.first_name ?? "",
    last_name: r.last_name ?? "",
    first_name_ar: r.first_name_ar ?? "",
    last_name_ar: r.last_name_ar ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    phone_alt: r.phone_alt ?? "",
    nationality: r.nationality ?? "",
    contact_type: r.contact_type ?? "BUYER",
    pipeline_type: r.pipeline_type ?? "SALES",
    source: r.source ?? "",
    source_detail: r.source_detail ?? "",
    budget_min: r.budget_min ?? "",
    budget_max: r.budget_max ?? "",
    currency: r.currency ?? "QAR",
    preferred_areas: Array.isArray(r.preferred_areas)
      ? r.preferred_areas.join(";")
      : "",
    bedrooms_min: r.bedrooms_min ?? "",
    bedrooms_max: r.bedrooms_max ?? "",
    property_types: Array.isArray(r.property_types)
      ? r.property_types.join(";")
      : "",
    notes: r.notes ?? "",
  }));
  return stringifyCsv(rows, { header: true, columns: CSV_COLUMNS as unknown as string[] });
}
