-- Company news table — stores recent news hits per MiCA entity
-- Run in Supabase SQL Editor before running fetch-company-news.mjs

CREATE TABLE IF NOT EXISTS company_news (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Article metadata
  headline      TEXT NOT NULL,
  snippet       TEXT,                  -- 1-2 sentence excerpt
  url           TEXT,
  source_name   TEXT,                  -- e.g. "The Block", "CoinDesk", "Reuters"
  published_at  TIMESTAMPTZ,          -- article publish date
  language      TEXT DEFAULT 'en',

  -- Search context
  search_query  TEXT,                  -- the query that found this
  relevance     TEXT CHECK (relevance IN ('high','medium','low')) DEFAULT 'medium',

  -- Bookkeeping
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One unique article per company (by URL)
CREATE UNIQUE INDEX IF NOT EXISTS company_news_company_url
  ON company_news (company_id, url);

-- Fast lookups for the News Tab
CREATE INDEX IF NOT EXISTS company_news_company_id
  ON company_news (company_id, published_at DESC);

-- Enable RLS (same pattern as other tables)
ALTER TABLE company_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON company_news FOR SELECT USING (true);
CREATE POLICY "Service write" ON company_news FOR ALL USING (true);
