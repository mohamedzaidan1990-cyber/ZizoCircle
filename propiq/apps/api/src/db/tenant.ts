import { Pool, PoolClient, types as pgTypes } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// node-postgres returns BIGINT (oid 20) and NUMERIC (oid 1700) as strings by
// default to preserve precision. Property prices and budgets fit comfortably
// in JS Number, so coerce them so the API contract matches the camelCase
// `Contact`/`Property` types in @propiq/shared.
pgTypes.setTypeParser(20, (val) => (val == null ? null : Number(val)));
pgTypes.setTypeParser(1700, (val) => (val == null ? null : Number(val)));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const SLUG_REGEX = /^[a-z0-9_]{3,40}$/;

export function assertSafeSlug(slug: string): void {
  if (!SLUG_REGEX.test(slug)) {
    throw new Error(`Unsafe tenant slug: ${slug}`);
  }
}

export function tenantSchemaName(slug: string): string {
  assertSafeSlug(slug);
  return `tenant_${slug}`;
}

export async function withTenant<T>(
  slug: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const schema = tenantSchemaName(slug);
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schema}", public`);
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function tenantQuery(
  slug: string,
  sql: string,
  params: unknown[] = [],
) {
  return withTenant(slug, (client) => client.query(sql, params));
}

let cachedTemplate: string | null = null;
function loadTenantSchemaTemplate(): string {
  if (cachedTemplate) return cachedTemplate;
  cachedTemplate = readFileSync(
    join(__dirname, "migrations", "createTenantSchema.sql"),
    "utf-8",
  );
  return cachedTemplate;
}

export async function createTenantSchema(slug: string): Promise<void> {
  assertSafeSlug(slug);
  const sql = loadTenantSchemaTemplate().replaceAll(":slug", slug);
  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}

export async function dropTenantSchema(slug: string): Promise<void> {
  assertSafeSlug(slug);
  const schema = tenantSchemaName(slug);
  const client = await pool.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    client.release();
  }
}

export async function tenantSchemaExists(slug: string): Promise<boolean> {
  assertSafeSlug(slug);
  const result = await pool.query(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
    [tenantSchemaName(slug)],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function closePool(): Promise<void> {
  await pool.end();
}
