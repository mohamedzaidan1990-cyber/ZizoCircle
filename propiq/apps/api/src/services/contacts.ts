import { parse as parseCsv } from "csv-parse/sync";
import { stringify as stringifyCsv } from "csv-stringify/sync";
import { z } from "zod";
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

const CONTACT_INSERT_COLS = new Set<string>([
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "email",
  "phone",
  "phoneAlt",
  "nationality",
  "contactType",
  "pipelineType",
  "source",
  "sourceDetail",
  "budgetMin",
  "budgetMax",
  "currency",
  "preferredAreas",
  "bedroomsMin",
  "bedroomsMax",
  "propertyTypes",
  "notes",
  "assignedTo",
]);

const CONTACT_UPDATE_COLS = new Set<string>([
  ...CONTACT_INSERT_COLS,
  "isArchived",
  "aiScore",
  "aiScoreReason",
  "aiScoredAt",
  "aiTier",
  "aiQualifiers",
  "conversationSummary",
  "propifyStatus",
  "propertyRef",
  "propertyName",
  "updatedAt",
]);

// Cells starting with these characters are interpreted as formulas when a
// downloaded CSV is opened in Excel/Sheets — prefix with a single quote.
const CSV_FORMULA_LEADERS = /^[=+\-@\t\r\n]/;

function sanitizeCsvCell<T>(value: T): T | string {
  if (typeof value !== "string") return value;
  return CSV_FORMULA_LEADERS.test(value) ? `'${value}` : value;
}

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
  const { columns, placeholders, values } = buildInsert(data, CONTACT_INSERT_COLS);
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

  const { clause, values } = buildUpdate(normalized, CONTACT_UPDATE_COLS);
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

// ── Bulk operations ─────────────────────────────────────────────────────────

export type BulkContactAction = "archive" | "unarchive" | "assign";

export interface BulkContactResult {
  updated: number;
}

export async function bulkUpdateContacts(
  slug: string,
  action: BulkContactAction,
  contactIds: string[],
  payload: { assignedTo?: string | null } = {},
): Promise<BulkContactResult> {
  if (contactIds.length === 0) return { updated: 0 };
  if (contactIds.length > 500) {
    throw Errors.validation("Bulk action limited to 500 contacts at a time");
  }
  return withTenant(slug, async (client) => {
    let result;
    switch (action) {
      case "archive":
        result = await client.query(
          `UPDATE contacts
             SET is_archived = TRUE, updated_at = NOW()
           WHERE id = ANY($1::uuid[])`,
          [contactIds],
        );
        break;
      case "unarchive":
        result = await client.query(
          `UPDATE contacts
             SET is_archived = FALSE, updated_at = NOW()
           WHERE id = ANY($1::uuid[])`,
          [contactIds],
        );
        break;
      case "assign":
        result = await client.query(
          `UPDATE contacts
             SET assigned_to = $2, updated_at = NOW()
           WHERE id = ANY($1::uuid[])`,
          [contactIds, payload.assignedTo ?? null],
        );
        break;
      default: {
        const _exhaustive: never = action;
        throw Errors.validation(`Unsupported bulk action: ${_exhaustive}`);
      }
    }
    return { updated: result.rowCount ?? 0 };
  });
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

// Zod schema for one parsed CSV row. csv-parse hands us strings for every
// field, so coercion happens here.
const csvCell = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => (v == null ? "" : typeof v === "number" ? String(v) : v.trim()));

const csvIntCell = csvCell.transform((s) => {
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
});

const csvContactTypeCell = csvCell.transform((s): ContactType => {
  const upper = s.toUpperCase();
  return (CONTACT_TYPES as readonly string[]).includes(upper)
    ? (upper as ContactType)
    : "BUYER";
});

const csvPipelineCell = csvCell.transform((s): PipelineType | undefined => {
  const upper = s.toUpperCase();
  return upper === "SALES" || upper === "LEASE"
    ? (upper as PipelineType)
    : undefined;
});

const csvRowSchema = z
  .object({
    first_name: csvCell.refine((s) => s.length > 0 && s.length <= 100, {
      message: "first_name must be 1–100 characters",
    }),
    last_name: csvCell.refine((s) => s.length <= 100, "last_name too long"),
    first_name_ar: csvCell.refine((s) => s.length <= 100, "first_name_ar too long"),
    last_name_ar: csvCell.refine((s) => s.length <= 100, "last_name_ar too long"),
    email: csvCell.refine(
      (s) => s === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
      "email is not a valid address",
    ),
    phone: csvCell.refine((s) => s.length >= 3 && s.length <= 50, {
      message: "phone must be 3–50 characters",
    }),
    phone_alt: csvCell.refine((s) => s.length <= 50, "phone_alt too long"),
    nationality: csvCell.refine((s) => s.length <= 50, "nationality too long"),
    contact_type: csvContactTypeCell,
    pipeline_type: csvPipelineCell,
    source: csvCell.refine((s) => s.length <= 50, "source too long"),
    source_detail: csvCell,
    budget_min: csvIntCell.refine(
      (n) => n === null || n >= 0,
      "budget_min cannot be negative",
    ),
    budget_max: csvIntCell.refine(
      (n) => n === null || n >= 0,
      "budget_max cannot be negative",
    ),
    currency: csvCell.refine(
      (s) => s === "" || s.length === 3,
      "currency must be a 3-letter code",
    ),
    preferred_areas: csvCell,
    bedrooms_min: csvIntCell,
    bedrooms_max: csvIntCell,
    property_types: csvCell,
    notes: csvCell,
  })
  .passthrough();

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

    const parsed = csvRowSchema.safeParse(row);
    if (!parsed.success) {
      result.skipped += 1;
      const reason = parsed.error.issues
        .map((i) => `${i.path.join(".") || "row"}: ${i.message}`)
        .join("; ");
      result.errors.push({ row: rowNum, reason });
      continue;
    }
    const r = parsed.data;

    try {
      await createContact(slug, {
        firstName: r.first_name,
        lastName: r.last_name || null,
        firstNameAr: r.first_name_ar || null,
        lastNameAr: r.last_name_ar || null,
        email: r.email || null,
        phone: r.phone,
        phoneAlt: r.phone_alt || null,
        nationality: r.nationality || null,
        contactType: r.contact_type,
        pipelineType: r.pipeline_type,
        source: r.source || null,
        sourceDetail: r.source_detail || null,
        budgetMin: r.budget_min,
        budgetMax: r.budget_max,
        currency: r.currency || "QAR",
        preferredAreas: parseList(r.preferred_areas),
        bedroomsMin: r.bedrooms_min,
        bedroomsMax: r.bedrooms_max,
        propertyTypes: parseList(r.property_types),
        notes: r.notes || null,
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
    first_name: sanitizeCsvCell(r.first_name ?? ""),
    last_name: sanitizeCsvCell(r.last_name ?? ""),
    first_name_ar: sanitizeCsvCell(r.first_name_ar ?? ""),
    last_name_ar: sanitizeCsvCell(r.last_name_ar ?? ""),
    email: sanitizeCsvCell(r.email ?? ""),
    phone: sanitizeCsvCell(r.phone ?? ""),
    phone_alt: sanitizeCsvCell(r.phone_alt ?? ""),
    nationality: sanitizeCsvCell(r.nationality ?? ""),
    contact_type: sanitizeCsvCell(r.contact_type ?? "BUYER"),
    pipeline_type: sanitizeCsvCell(r.pipeline_type ?? "SALES"),
    source: sanitizeCsvCell(r.source ?? ""),
    source_detail: sanitizeCsvCell(r.source_detail ?? ""),
    budget_min: r.budget_min ?? "",
    budget_max: r.budget_max ?? "",
    currency: sanitizeCsvCell(r.currency ?? "QAR"),
    preferred_areas: Array.isArray(r.preferred_areas)
      ? sanitizeCsvCell(r.preferred_areas.join(";"))
      : "",
    bedrooms_min: r.bedrooms_min ?? "",
    bedrooms_max: r.bedrooms_max ?? "",
    property_types: Array.isArray(r.property_types)
      ? sanitizeCsvCell(r.property_types.join(";"))
      : "",
    notes: sanitizeCsvCell(r.notes ?? ""),
  }));
  return stringifyCsv(rows, { header: true, columns: CSV_COLUMNS as unknown as string[] });
}
