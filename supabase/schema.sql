-- Trinity Ops Manager — Supabase Schema
-- Run this in Supabase SQL editor to set up all tables

-- ─── SNAPSHOTS (trend data) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS snapshots (
  id BIGSERIAL PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary JSONB,
  lead_count INTEGER DEFAULT 0,
  opportunity_count INTEGER DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  stale_leads_count INTEGER DEFAULT 0,
  rep_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_snapshots_captured_at ON snapshots (captured_at DESC);

-- ─── LEADS (cached from SF) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY, -- Salesforce Id
  first_name TEXT,
  last_name TEXT,
  status TEXT,
  owner_id TEXT,
  owner_name TEXT,
  created_date TIMESTAMPTZ,
  last_modified TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  lead_source TEXT,
  is_converted BOOLEAN DEFAULT FALSE,
  converted_date TIMESTAMPTZ,
  phone TEXT,
  email TEXT,
  state TEXT,
  city TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads (owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_is_converted ON leads (is_converted);

-- ─── REP STATS (calculated, refreshed on sync) ────────────────────────────────
CREATE TABLE IF NOT EXISTS rep_stats (
  "ownerId" TEXT PRIMARY KEY,
  "ownerName" TEXT,
  "totalLeads" INTEGER DEFAULT 0,
  "convertedLeads" INTEGER DEFAULT 0,
  "conversionRate" INTEGER DEFAULT 0,
  "avgDaysToConvert" INTEGER DEFAULT 0,
  "staleLeads" INTEGER DEFAULT 0,
  "activeLeads" INTEGER DEFAULT 0,
  "tasksLogged" INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── OPPORTUNITY CACHE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  name TEXT,
  stage_name TEXT,
  amount NUMERIC,
  close_date DATE,
  owner_id TEXT,
  owner_name TEXT,
  created_date TIMESTAMPTZ,
  last_modified TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  is_closed BOOLEAN DEFAULT FALSE,
  is_won BOOLEAN DEFAULT FALSE,
  probability INTEGER,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opps_owner_id ON opportunities (owner_id);
CREATE INDEX IF NOT EXISTS idx_opps_stage ON opportunities (stage_name);

-- ─── ROW LEVEL SECURITY (disable for service role access) ─────────────────────
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE rep_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used server-side)
CREATE POLICY "service role all" ON snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "service role all" ON leads FOR ALL TO service_role USING (true);
CREATE POLICY "service role all" ON rep_stats FOR ALL TO service_role USING (true);
CREATE POLICY "service role all" ON opportunities FOR ALL TO service_role USING (true);
