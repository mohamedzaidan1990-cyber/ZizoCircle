-- Tenant schema template. The string :slug is replaced at runtime in tenant.ts.
-- Slugs are validated against ^[a-z0-9_]{3,40}$ before substitution to keep this safe.

CREATE SCHEMA IF NOT EXISTS tenant_:slug;

CREATE TABLE IF NOT EXISTS tenant_:slug.contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100),
  first_name_ar   VARCHAR(100),
  last_name_ar    VARCHAR(100),
  email           VARCHAR(255),
  phone           VARCHAR(50) NOT NULL,
  phone_alt       VARCHAR(50),
  nationality     VARCHAR(50),
  contact_type    VARCHAR(20) NOT NULL DEFAULT 'BUYER',
  source          VARCHAR(50),
  source_detail   TEXT,
  budget_min      BIGINT,
  budget_max      BIGINT,
  currency        VARCHAR(3) DEFAULT 'QAR',
  preferred_areas TEXT[] DEFAULT '{}',
  bedrooms_min    INTEGER,
  bedrooms_max    INTEGER,
  property_types  TEXT[] DEFAULT '{}',
  notes           TEXT,
  ai_score        INTEGER DEFAULT 0,
  ai_score_reason TEXT,
  ai_scored_at    TIMESTAMPTZ,
  ai_tier         VARCHAR(10),
  ai_qualifiers   JSONB DEFAULT '{}',
  conversation_summary TEXT,
  status          VARCHAR(20) DEFAULT 'NEW',
  property_ref    VARCHAR(50),
  property_name   VARCHAR(255),
  assigned_to     VARCHAR(50),
  is_archived     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_:slug.properties (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no      VARCHAR(50) UNIQUE,
  title             VARCHAR(255) NOT NULL,
  title_ar          VARCHAR(255),
  description       TEXT,
  description_ar    TEXT,
  ai_description    TEXT,
  ai_description_ar TEXT,
  ai_highlights     JSONB DEFAULT '[]',
  property_type     VARCHAR(50) NOT NULL,
  listing_type      VARCHAR(20) NOT NULL DEFAULT 'SALE',
  status            VARCHAR(20) DEFAULT 'AVAILABLE',
  price             BIGINT,
  rent_price        BIGINT,
  rent_period       VARCHAR(20),
  currency          VARCHAR(3) DEFAULT 'QAR',
  area_sqm          DECIMAL(10,2),
  bedrooms          INTEGER,
  bathrooms         INTEGER,
  parking_spaces    INTEGER,
  floor_number      INTEGER,
  total_floors      INTEGER,
  furnished         VARCHAR(20) DEFAULT 'UNFURNISHED',
  country           VARCHAR(50) DEFAULT 'Qatar',
  city              VARCHAR(100) DEFAULT 'Doha',
  area              VARCHAR(100),
  sub_area          VARCHAR(100),
  building_name     VARCHAR(200),
  unit_number       VARCHAR(50),
  latitude          DECIMAL(10,8),
  longitude         DECIMAL(11,8),
  photos            TEXT[] DEFAULT '{}',
  floor_plan_url    TEXT,
  video_url         TEXT,
  virtual_tour_url  TEXT,
  bayut_id          VARCHAR(100),
  bayut_synced_at   TIMESTAMPTZ,
  pf_id             VARCHAR(100),
  pf_synced_at      TIMESTAMPTZ,
  owner_contact_id  UUID,
  assigned_to       VARCHAR(50),
  created_by        VARCHAR(50),
  is_exclusive      BOOLEAN DEFAULT FALSE,
  exclusive_until   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_:slug.deals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  deal_type        VARCHAR(20) NOT NULL DEFAULT 'SALE',
  stage            VARCHAR(50) NOT NULL DEFAULT 'NEW_LEAD',
  value            BIGINT,
  commission_rate  DECIMAL(5,4) DEFAULT 0.02,
  commission_value BIGINT,
  currency         VARCHAR(3) DEFAULT 'QAR',
  probability      INTEGER DEFAULT 20,
  expected_close   DATE,
  closed_at        TIMESTAMPTZ,
  lost_reason      TEXT,
  contact_id       UUID,
  property_id      UUID,
  assigned_to      VARCHAR(50),
  ai_next_action   TEXT,
  ai_risk_flags    JSONB DEFAULT '[]',
  priority         VARCHAR(10) DEFAULT 'medium',
  source           VARCHAR(50),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_:slug.activities (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type      VARCHAR(30) NOT NULL,
  direction          VARCHAR(10),
  subject            VARCHAR(255),
  body               TEXT,
  status             VARCHAR(20) DEFAULT 'COMPLETED',
  scheduled_at       TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds   INTEGER,
  call_recording_url TEXT,
  call_transcript    TEXT,
  call_summary       TEXT,
  call_outcome       VARCHAR(50),
  contact_id         UUID,
  deal_id            UUID,
  property_id        UUID,
  created_by         VARCHAR(50) NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_:slug.documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  doc_type     VARCHAR(50) DEFAULT 'OTHER',
  file_url     TEXT NOT NULL,
  file_size    INTEGER,
  mime_type    VARCHAR(100),
  status       VARCHAR(20) DEFAULT 'DRAFT',
  signed_at    TIMESTAMPTZ,
  contact_id   UUID,
  deal_id      UUID,
  property_id  UUID,
  uploaded_by  VARCHAR(50) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_:slug.templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  channel     VARCHAR(20) NOT NULL,
  subject     VARCHAR(255),
  body_en     TEXT NOT NULL,
  body_ar     TEXT,
  variables   TEXT[] DEFAULT '{}',
  created_by  VARCHAR(50) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_:slug.sequences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50),
  steps        JSONB NOT NULL DEFAULT '[]',
  is_active    BOOLEAN DEFAULT TRUE,
  created_by   VARCHAR(50) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contacts_assigned_to_idx ON tenant_:slug.contacts(assigned_to);
CREATE INDEX IF NOT EXISTS contacts_contact_type_idx ON tenant_:slug.contacts(contact_type);
CREATE INDEX IF NOT EXISTS contacts_ai_score_idx     ON tenant_:slug.contacts(ai_score DESC);
CREATE INDEX IF NOT EXISTS contacts_is_archived_idx  ON tenant_:slug.contacts(is_archived);
CREATE INDEX IF NOT EXISTS properties_status_idx        ON tenant_:slug.properties(status);
CREATE INDEX IF NOT EXISTS properties_listing_type_idx  ON tenant_:slug.properties(listing_type);
CREATE INDEX IF NOT EXISTS properties_area_idx          ON tenant_:slug.properties(area);
CREATE INDEX IF NOT EXISTS deals_stage_idx       ON tenant_:slug.deals(stage);
CREATE INDEX IF NOT EXISTS deals_assigned_to_idx ON tenant_:slug.deals(assigned_to);
CREATE INDEX IF NOT EXISTS activities_contact_id_idx ON tenant_:slug.activities(contact_id);
CREATE INDEX IF NOT EXISTS activities_deal_id_idx    ON tenant_:slug.activities(deal_id);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON tenant_:slug.activities(created_at DESC);
