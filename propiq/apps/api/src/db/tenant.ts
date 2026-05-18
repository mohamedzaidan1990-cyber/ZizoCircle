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
    // search_path is session-level — if we returned this client to the pool
    // without resetting, a subsequent consumer that forgot to set search_path
    // would silently land on this tenant's schema. Always reset; if the reset
    // itself fails, destroy the connection so the pool can't reuse it.
    try {
      await client.query("RESET search_path");
      client.release();
    } catch {
      try {
        client.release(true);
      } catch {
        // pool already dropped it; nothing to do
      }
    }
  }
}

export async function tenantQuery(
  slug: string,
  sql: string,
  params: unknown[] = [],
) {
  return withTenant(slug, (client) => client.query(sql, params));
}

const cache = new Map<string, string>();
function loadSqlTemplate(filename: string): string {
  const cached = cache.get(filename);
  if (cached) return cached;
  const sql = readFileSync(
    join(__dirname, "migrations", filename),
    "utf-8",
  );
  cache.set(filename, sql);
  return sql;
}

async function runTemplateForTenant(filename: string, slug: string): Promise<void> {
  assertSafeSlug(slug);
  const sql = loadSqlTemplate(filename).replaceAll(":slug", slug);
  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}

export async function createTenantSchema(slug: string): Promise<void> {
  await runTemplateForTenant("createTenantSchema.sql", slug);
  // Idempotent — also runs every later migration so the tenant is at HEAD
  // immediately. Add new migrations to migrateAllForTenant() too.
  await migrateAllForTenant(slug);
}

export async function migratePropifySchema(slug: string): Promise<void> {
  await runTemplateForTenant("propifyTenantMigration.sql", slug);
}

export async function migrateSearchIndexes(slug: string): Promise<void> {
  await runTemplateForTenant("addSearchIndexes.sql", slug);
}

export async function migrateCampaignsSchema(slug: string): Promise<void> {
  await runTemplateForTenant("propifyCampaignsMigration.sql", slug);
}

/** Runs every additive migration for a single tenant, in the order they
 * were introduced. Each underlying SQL is idempotent. */
export async function migrateAllForTenant(slug: string): Promise<void> {
  await migratePropifySchema(slug);
  await migrateSearchIndexes(slug);
  await migrateCampaignsSchema(slug);
}

/** Returns the list of existing tenant schemas — used by ops scripts and
 * the boot-time migration sweep to fan out across every tenant. */
export async function listTenantSchemas(): Promise<string[]> {
  const result = await pool.query(
    `SELECT schema_name
       FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name`,
  );
  return result.rows
    .map((r) => (r.schema_name as string).replace(/^tenant_/, ""))
    .filter((slug) => SLUG_REGEX.test(slug));
}

export interface MigrateAllTenantsResult {
  slugs: string[];
  errors: Array<{ slug: string; error: string }>;
}

/** Fans out every additive migration across every existing tenant. Safe to
 * call repeatedly — each underlying SQL uses IF NOT EXISTS / ADD COLUMN IF
 * NOT EXISTS. One failing tenant doesn't stop the others. */
export async function migrateAllTenants(): Promise<MigrateAllTenantsResult> {
  const slugs = await listTenantSchemas();
  const errors: Array<{ slug: string; error: string }> = [];
  for (const slug of slugs) {
    try {
      await migrateAllForTenant(slug);
    } catch (err) {
      errors.push({
        slug,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { slugs, errors };
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
