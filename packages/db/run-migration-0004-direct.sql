-- Migration 0004: Add Business Context Fields to Opportunities Table
-- Date: 2026-01-20
-- Execute this SQL in Neon Console or psql

-- Add new columns
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS store_type TEXT,
ADD COLUMN IF NOT EXISTS service_type TEXT,
ADD COLUMN IF NOT EXISTS staff_count TEXT,
ADD COLUMN IF NOT EXISTS current_system TEXT,
ADD COLUMN IF NOT EXISTS decision_maker_present TEXT;

-- Add column comments for documentation
COMMENT ON COLUMN opportunities.store_type IS '店型/店鋪類型 (e.g., coffee_shop, hair_salon)';
COMMENT ON COLUMN opportunities.service_type IS '營運型態 (e.g., dine_in, takeout) - iCHEF only';
COMMENT ON COLUMN opportunities.staff_count IS '員工數量 (e.g., 1-3, 4-10) - Beauty only';
COMMENT ON COLUMN opportunities.current_system IS '現有POS/系統 (e.g., none, ichef_old, excel)';
COMMENT ON COLUMN opportunities.decision_maker_present IS '決策者在場 (yes, no, unknown)';

-- Verify migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'opportunities'
  AND column_name IN ('store_type', 'service_type', 'staff_count', 'current_system', 'decision_maker_present')
ORDER BY column_name;
