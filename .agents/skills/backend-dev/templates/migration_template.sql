-- Migration: [DESCRIPTION]
-- Created: [DATE]
-- Author: [AUTHOR]

-- ============================================================
-- UP MIGRATION
-- ============================================================

-- Create table
CREATE TABLE IF NOT EXISTS table_name (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenancy (REQUIRED)
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Foreign keys
  -- related_table_id UUID NOT NULL REFERENCES related_table(id) ON DELETE CASCADE,

  -- Business columns
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) DEFAULT 0,

  -- Boolean flags (use is_ or has_ prefix)
  is_active BOOLEAN DEFAULT true,

  -- Timestamps (REQUIRED)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (REQUIRED)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create indexes (REQUIRED for foreign keys)
CREATE INDEX IF NOT EXISTS idx_table_name_account_id ON table_name(account_id);
-- CREATE INDEX IF NOT EXISTS idx_table_name_related_table_id ON table_name(related_table_id);

-- RLS Policies
CREATE POLICY "Users can view own account data"
ON table_name FOR SELECT
USING (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert in own account"
ON table_name FOR INSERT
WITH CHECK (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own account data"
ON table_name FOR UPDATE
USING (account_id = (SELECT account_id FROM users WHERE id = auth.uid()))
WITH CHECK (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete from own account"
ON table_name FOR DELETE
USING (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_table_name_updated_at
BEFORE UPDATE ON table_name
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DOWN MIGRATION (for rollback)
-- ============================================================

-- DROP TRIGGER IF EXISTS update_table_name_updated_at ON table_name;
-- DROP POLICY IF EXISTS "Users can view own account data" ON table_name;
-- DROP POLICY IF EXISTS "Users can insert in own account" ON table_name;
-- DROP POLICY IF EXISTS "Users can update own account data" ON table_name;
-- DROP POLICY IF EXISTS "Users can delete from own account" ON table_name;
-- DROP INDEX IF EXISTS idx_table_name_account_id;
-- DROP TABLE IF EXISTS table_name;
