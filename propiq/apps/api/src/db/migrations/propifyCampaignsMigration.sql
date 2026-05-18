-- Adds outbound-campaign + universal-CRM-webhook tables to a tenant schema.
-- Idempotent (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
-- Replace :slug at runtime in tenant.ts (slug is regex-validated first).

-- ── Campaign definitions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_:slug.propify_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  template_name   VARCHAR(255) NOT NULL,
  template_lang   VARCHAR(10)  NOT NULL DEFAULT 'en',
  -- Ordered list of {key, value} pairs. `key` is the WhatsApp placeholder
  -- number ("1","2",…); `value` is either a contact field name to resolve
  -- per-recipient or a static string fallback.
  template_params JSONB        NOT NULL DEFAULT '[]'::jsonb,
  status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                  CHECK (status IN ('DRAFT','SCHEDULED','RUNNING','PAUSED','COMPLETED','FAILED')),
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_by      VARCHAR(50),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Per-recipient message rows ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_:slug.propify_campaign_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES tenant_:slug.propify_campaigns(id) ON DELETE CASCADE,
  contact_id   UUID,
  phone        VARCHAR(30) NOT NULL,
  -- Resolved template variables for this recipient, keyed by placeholder number.
  params       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING','SENT','DELIVERED','READ','REPLIED','FAILED','OPTED_OUT')),
  waba_msg_id  VARCHAR(255),
  sent_at      TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at      TIMESTAMPTZ,
  replied_at   TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Opt-out registry (never message these phones) ───────────────────────────
CREATE TABLE IF NOT EXISTS tenant_:slug.propify_optouts (
  phone        VARCHAR(30) PRIMARY KEY,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason       TEXT
);

-- ── Universal CRM webhook config ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_:slug.propify_webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  url           TEXT NOT NULL,
  secret        VARCHAR(255),
  events        TEXT[] NOT NULL DEFAULT ARRAY['lead.qualified']::text[],
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_fired_at TIMESTAMPTZ,
  last_status   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS propify_campaign_messages_campaign_idx
  ON tenant_:slug.propify_campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS propify_campaign_messages_status_idx
  ON tenant_:slug.propify_campaign_messages(status);
CREATE INDEX IF NOT EXISTS propify_campaign_messages_phone_idx
  ON tenant_:slug.propify_campaign_messages(phone);
CREATE INDEX IF NOT EXISTS propify_campaigns_status_idx
  ON tenant_:slug.propify_campaigns(status);
CREATE INDEX IF NOT EXISTS propify_webhooks_active_events_idx
  ON tenant_:slug.propify_webhooks USING gin (events)
  WHERE is_active = TRUE;
