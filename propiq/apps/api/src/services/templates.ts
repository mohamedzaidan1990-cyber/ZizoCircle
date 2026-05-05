import { withTenant } from "../db/tenant";
import { Errors } from "../lib/errors";
import { buildInsert, rowsToCamel, rowToCamel } from "../lib/sql";

export type TemplateChannel = "EMAIL" | "WHATSAPP" | "SMS";

export interface Template {
  id: string;
  name: string;
  channel: TemplateChannel;
  subject: string | null;
  bodyEn: string;
  bodyAr: string | null;
  variables: string[];
  createdBy: string;
  createdAt: string;
}

export interface CreateTemplateInput {
  name: string;
  channel: TemplateChannel;
  subject?: string | null;
  bodyEn: string;
  bodyAr?: string | null;
  variables?: string[];
  createdBy: string;
}

export async function listTemplates(
  slug: string,
  channel?: TemplateChannel,
): Promise<Template[]> {
  const filters: string[] = [];
  const values: unknown[] = [];
  if (channel) {
    filters.push(`channel = $1`);
    values.push(channel);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const result = await withTenant(slug, (client) =>
    client.query(
      `SELECT * FROM templates ${where} ORDER BY created_at DESC`,
      values,
    ),
  );
  return rowsToCamel<Template>(result.rows);
}

export async function getTemplate(
  slug: string,
  id: string,
): Promise<Template> {
  const result = await withTenant(slug, (client) =>
    client.query(`SELECT * FROM templates WHERE id = $1`, [id]),
  );
  if (!result.rows[0]) throw Errors.notFound("Template not found");
  return rowToCamel<Template>(result.rows[0]);
}

export async function createTemplate(
  slug: string,
  input: CreateTemplateInput,
): Promise<Template> {
  const data = {
    name: input.name,
    channel: input.channel,
    subject: input.subject ?? null,
    bodyEn: input.bodyEn,
    bodyAr: input.bodyAr ?? null,
    variables: input.variables ?? [],
    createdBy: input.createdBy,
  };
  const { columns, placeholders, values } = buildInsert(data);
  const result = await withTenant(slug, (client) =>
    client.query(
      `INSERT INTO templates (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    ),
  );
  return rowToCamel<Template>(result.rows[0]);
}

export async function deleteTemplate(slug: string, id: string): Promise<void> {
  const result = await withTenant(slug, (client) =>
    client.query(`DELETE FROM templates WHERE id = $1`, [id]),
  );
  if (result.rowCount === 0) throw Errors.notFound("Template not found");
}
