-- Salesforce Operations Dashboard Schema
-- Run this in Supabase SQL editor

-- ============ LEADS ============
DROP TABLE IF EXISTS leads CASCADE;
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  owner_id TEXT,
  owner_name TEXT,
  created_date TIMESTAMPTZ,
  last_activity_date TIMESTAMPTZ,
  is_converted BOOLEAN DEFAULT false,
  phone TEXT,
  email TEXT,
  company TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_is_converted ON leads(is_converted);

-- ============ OPPORTUNITIES ============
DROP TABLE IF EXISTS opportunities CASCADE;
CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  name TEXT,
  stage_name TEXT,
  owner_id TEXT,
  owner_name TEXT,
  amount DECIMAL(15,2),
  close_date DATE,
  created_date TIMESTAMPTZ,
  last_activity_date TIMESTAMPTZ,
  lead_source TEXT,
  is_closed BOOLEAN DEFAULT false,
  is_won BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opps_stage ON opportunities(stage_name);
CREATE INDEX idx_opps_owner_id ON opportunities(owner_id);
CREATE INDEX idx_opps_is_closed ON opportunities(is_closed);
CREATE INDEX idx_opps_close_date ON opportunities(close_date);

-- ============ TRANSACTIONS ============
DROP TABLE IF EXISTS transactions CASCADE;
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  name TEXT,
  path_stage TEXT,
  dispo_status TEXT,
  disposition_decision TEXT,
  acquisition_rep_id TEXT,
  acquisition_rep_name TEXT,
  dispositions_rep_id TEXT,
  dispositions_rep_name TEXT,
  contract_assignment_price DECIMAL(15,2),
  assignment_fee DECIMAL(15,2),
  net_profit DECIMAL(15,2),
  closing_date DATE,
  created_date TIMESTAMPTZ,
  last_activity_date TIMESTAMPTZ,
  pending_stage TEXT,
  marketing_stage TEXT,
  showing_status TEXT,
  assigned_stage TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tx_path ON transactions(path_stage);
CREATE INDEX idx_tx_dispo_status ON transactions(dispo_status);
CREATE INDEX idx_tx_closing_date ON transactions(closing_date);
CREATE INDEX idx_tx_acq_rep ON transactions(acquisition_rep_id);
CREATE INDEX idx_tx_dispo_rep ON transactions(dispositions_rep_id);

-- ============ REP STATS (LEADS) ============
DROP TABLE IF EXISTS rep_stats_leads CASCADE;
CREATE TABLE rep_stats_leads (
  id SERIAL PRIMARY KEY,
  rep_id TEXT NOT NULL,
  rep_name TEXT NOT NULL,
  total_assigned INTEGER DEFAULT 0,
  new_count INTEGER DEFAULT 0,
  working_count INTEGER DEFAULT 0,
  qualified_count INTEGER DEFAULT 0,
  offer_count INTEGER DEFAULT 0,
  unqualified_count INTEGER DEFAULT 0,
  avg_days_no_activity INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ,
  is_warning BOOLEAN DEFAULT false,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rep_id, computed_at)
);

CREATE INDEX idx_rep_leads_rep_id ON rep_stats_leads(rep_id);

-- ============ REP STATS (OPPORTUNITIES) ============
DROP TABLE IF EXISTS rep_stats_opps CASCADE;
CREATE TABLE rep_stats_opps (
  id SERIAL PRIMARY KEY,
  rep_id TEXT NOT NULL,
  rep_name TEXT NOT NULL,
  total_opps INTEGER DEFAULT 0,
  closing_rate INTEGER DEFAULT 0,
  avg_days_to_close INTEGER DEFAULT 0,
  pipeline_value DECIMAL(15,2) DEFAULT 0,
  closed_won_month INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rep_id, computed_at)
);

CREATE INDEX idx_rep_opps_rep_id ON rep_stats_opps(rep_id);

-- ============ REP STATS (TRANSACTIONS) ============
DROP TABLE IF EXISTS rep_stats_transactions CASCADE;
CREATE TABLE rep_stats_transactions (
  id SERIAL PRIMARY KEY,
  rep_id TEXT NOT NULL,
  rep_name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'acquisition' or 'disposition'
  total_transactions INTEGER DEFAULT 0,
  active_count INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  closed_won_count INTEGER DEFAULT 0,
  total_value DECIMAL(15,2) DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rep_id, role, computed_at)
);

CREATE INDEX idx_rep_tx_rep_id ON rep_stats_transactions(rep_id);

-- ============ SNAPSHOTS ============
DROP TABLE IF EXISTS snapshots CASCADE;
CREATE TABLE snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_type TEXT NOT NULL, -- 'leads', 'opportunities', 'transactions', 'full'
  data JSONB,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_type ON snapshots(snapshot_type);
CREATE INDEX idx_snapshots_computed_at ON snapshots(computed_at DESC);

-- ============ SYNC LOG ============
DROP TABLE IF EXISTS sync_log CASCADE;
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'leads', 'opportunities', 'transactions', 'full'
  records_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success', -- 'success', 'error'
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_log_type ON sync_log(sync_type);
CREATE INDEX idx_sync_log_started_at ON sync_log(started_at DESC);

-- Get last sync time for each type
CREATE OR REPLACE FUNCTION get_last_sync(p_type TEXT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN (
    SELECT completed_at 
    FROM sync_log 
    WHERE sync_type = p_type AND status = 'success'
    ORDER BY completed_at DESC 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;
