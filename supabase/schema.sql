-- MiCA Prospecting & Enrichment Platform
-- Run this in Supabase SQL Editor to set up all tables

-- ============================================================
-- companies
-- ============================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core ESMA fields
  lei TEXT UNIQUE NOT NULL,
  lei_cou_code CHAR(2),
  company_name TEXT NOT NULL,
  commercial_name TEXT,
  competent_authority TEXT,
  home_member_state CHAR(2),
  address TEXT,
  city TEXT,
  country CHAR(2),
  website TEXT,
  website_platform TEXT,
  authorization_date DATE,
  authorization_end_date DATE,
  last_updated_esma DATE,
  passporting_countries TEXT[],
  passporting_count INTEGER DEFAULT 0,
  esma_comments TEXT,

  -- Derived service summary
  service_count INTEGER DEFAULT 0,

  -- Enrichment fields
  linkedin_url TEXT,
  description TEXT,
  description_confidence TEXT,
  segment TEXT,
  parent_company_name TEXT,
  parent_company_domain TEXT,
  group_structure_notes TEXT,
  latest_news_summary TEXT,
  news_last_searched TIMESTAMPTZ,

  -- White paper linkage
  linked_token_issuers_count INTEGER DEFAULT 0,

  -- Status and workflow
  status TEXT DEFAULT 'new',
  amina_fit_score INTEGER,
  tags TEXT[],
  notes TEXT,
  d365_source_tag TEXT DEFAULT 'MiCA Dashboard',

  -- Enrichment flags (manual triggers)
  flag_enrich_description BOOLEAN DEFAULT false,
  flag_enrich_news BOOLEAN DEFAULT false,
  flag_enrich_people BOOLEAN DEFAULT false,
  enrichment_last_run TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_country ON companies(home_member_state);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_segment ON companies(segment);

-- ============================================================
-- company_services (junction table)
-- ============================================================
CREATE TABLE company_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  service_code CHAR(1) NOT NULL,
  service_name TEXT NOT NULL,
  UNIQUE(company_id, service_code)
);

CREATE INDEX idx_company_services_code ON company_services(service_code);
CREATE INDEX idx_company_services_company ON company_services(company_id);

-- ============================================================
-- contacts
-- ============================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  given_name TEXT,
  surname TEXT,
  role TEXT,
  linkedin_url TEXT,
  email TEXT,
  email_source TEXT,
  phone TEXT,
  location_city TEXT,
  location_country TEXT,
  discovery_source TEXT,
  enrichment_confidence TEXT,
  last_enriched TIMESTAMPTZ,
  outreach_status TEXT DEFAULT 'not_contacted',
  last_contact_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contacts_company ON contacts(company_id);

-- ============================================================
-- token_issuers (from OTHER.csv)
-- ============================================================
CREATE TABLE token_issuers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lei TEXT,
  issuer_name TEXT NOT NULL,
  country_code CHAR(2),
  linked_casp_lei TEXT,
  linked_casp_name TEXT,
  offer_countries TEXT[],
  dti TEXT,
  white_paper_url TEXT,
  last_updated DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_token_issuers_casp_lei ON token_issuers(linked_casp_lei);

-- ============================================================
-- RLS (open policies for MVP)
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_issuers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all" ON company_services FOR ALL USING (true);
CREATE POLICY "Allow all" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all" ON token_issuers FOR ALL USING (true);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
