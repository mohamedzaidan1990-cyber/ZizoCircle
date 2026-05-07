-- Adds Propify-related columns to existing tenant schemas. Idempotent.
-- Replace :slug at runtime in tenant.ts (slug is regex-validated first).

ALTER TABLE tenant_:slug.contacts ADD COLUMN IF NOT EXISTS ai_tier VARCHAR(10);
ALTER TABLE tenant_:slug.contacts ADD COLUMN IF NOT EXISTS ai_qualifiers JSONB DEFAULT '{}';
ALTER TABLE tenant_:slug.contacts ADD COLUMN IF NOT EXISTS conversation_summary TEXT;
ALTER TABLE tenant_:slug.contacts
  ADD COLUMN IF NOT EXISTS propify_status VARCHAR(20) DEFAULT 'NEW';
-- Add the CHECK constraint separately so re-runs don't fail.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'tenant_:slug'
      AND table_name = 'contacts'
      AND constraint_name = 'contacts_propify_status_check'
  ) THEN
    ALTER TABLE tenant_:slug.contacts
      ADD CONSTRAINT contacts_propify_status_check
      CHECK (propify_status IN ('NEW', 'ARCHIVED'));
  END IF;
END $$;
ALTER TABLE tenant_:slug.contacts ADD COLUMN IF NOT EXISTS property_ref VARCHAR(50);
ALTER TABLE tenant_:slug.contacts ADD COLUMN IF NOT EXISTS property_name VARCHAR(255);

ALTER TABLE tenant_:slug.deals ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';
ALTER TABLE tenant_:slug.deals ADD COLUMN IF NOT EXISTS source VARCHAR(50);

CREATE INDEX IF NOT EXISTS contacts_ai_tier_idx        ON tenant_:slug.contacts(ai_tier);
CREATE INDEX IF NOT EXISTS contacts_propify_status_idx ON tenant_:slug.contacts(propify_status);
