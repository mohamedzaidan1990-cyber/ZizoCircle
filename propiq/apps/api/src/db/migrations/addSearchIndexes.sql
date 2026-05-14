-- Adds trigram + covering indexes to a tenant schema. Idempotent so it's
-- safe to re-run; createTenantSchema also runs this immediately after the
-- base schema so new tenants get the same shape as migrated ones.
--
-- Requires the pg_trgm extension. On hosted Postgres (RDS, Neon, Supabase,
-- Railway) it's available by default; if the CREATE EXTENSION below fails
-- with "permission denied", a DBA needs to run it once per database:
--   CREATE EXTENSION pg_trgm;
-- After that, this script (which uses IF NOT EXISTS) is a no-op for the
-- extension and just adds the indexes.
--
-- Replace :slug at runtime in tenant.ts (slug is regex-validated first).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Trigram GIN indexes — power ILIKE '%term%' searches on contacts and
-- properties without resorting to seq scans. pg_trgm extracts lowercase
-- trigrams internally, so a plain (col gin_trgm_ops) index is used by
-- both LIKE and ILIKE queries.

CREATE INDEX IF NOT EXISTS contacts_first_name_trgm_idx
  ON tenant_:slug.contacts USING gin (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS contacts_last_name_trgm_idx
  ON tenant_:slug.contacts USING gin (last_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS contacts_email_trgm_idx
  ON tenant_:slug.contacts USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS contacts_phone_trgm_idx
  ON tenant_:slug.contacts USING gin (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS properties_title_trgm_idx
  ON tenant_:slug.properties USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS properties_title_ar_trgm_idx
  ON tenant_:slug.properties USING gin (title_ar gin_trgm_ops);

CREATE INDEX IF NOT EXISTS properties_reference_no_trgm_idx
  ON tenant_:slug.properties USING gin (reference_no gin_trgm_ops);

CREATE INDEX IF NOT EXISTS properties_area_trgm_idx
  ON tenant_:slug.properties USING gin (area gin_trgm_ops);

CREATE INDEX IF NOT EXISTS properties_sub_area_trgm_idx
  ON tenant_:slug.properties USING gin (sub_area gin_trgm_ops);

CREATE INDEX IF NOT EXISTS properties_building_name_trgm_idx
  ON tenant_:slug.properties USING gin (building_name gin_trgm_ops);

-- ── Notes on scale
-- Each CREATE INDEX takes an ACCESS EXCLUSIVE lock on the table for the
-- duration of the build, blocking concurrent writes. For tenants with
-- > 100K rows this can be felt; rewrite these to CREATE INDEX CONCURRENTLY
-- (one statement per call, since CONCURRENTLY can't run in a transaction
-- and runTemplateForTenant sends the whole file in one client.query).

-- ── Covering composite indexes — match the hottest list queries.
-- listContacts always filters by is_archived and orders by created_at DESC;
-- a composite makes the common path index-only.
CREATE INDEX IF NOT EXISTS contacts_archived_created_idx
  ON tenant_:slug.contacts (is_archived, created_at DESC);

-- Filtered "hot leads" page: is_archived=false ordered by ai_score DESC.
-- Partial index keeps it small.
CREATE INDEX IF NOT EXISTS contacts_active_score_idx
  ON tenant_:slug.contacts (ai_score DESC NULLS LAST, created_at DESC)
  WHERE is_archived = false;

-- Pipeline page filters by stage + open/closed; partial index supports the
-- "open deals" view that the dashboard hits on every load.
CREATE INDEX IF NOT EXISTS deals_open_updated_idx
  ON tenant_:slug.deals (updated_at DESC)
  WHERE stage NOT IN ('CLOSED_WON', 'CLOSED_LOST');

-- Activities timeline is queried per-contact ordered by completed_at;
-- composite avoids the sort step.
CREATE INDEX IF NOT EXISTS activities_contact_completed_idx
  ON tenant_:slug.activities (contact_id, completed_at DESC NULLS LAST)
  WHERE contact_id IS NOT NULL;
