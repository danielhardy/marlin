-- 10_daily_digests.sql
-- This table looks like a pre-calculated summary table. Consider if a VIEW or FUNCTION might be better
-- unless performance requires materialized data.

CREATE TABLE daily_digests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    cash_in NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cash_out NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Should likely be stored positive
    tax_reserved NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    unreviewed_count INTEGER NOT NULL DEFAULT 0,
    -- Ensure only one digest per business per day
    CONSTRAINT unique_digest_per_day UNIQUE (business_id, date)
);

-- Index for lookups by business and date range
CREATE INDEX idx_daily_digests_business_id_date ON daily_digests(business_id, date);

-- RLS: Check ownership via the linked business
-- ALTER TABLE daily_digests ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view daily digests for their businesses" ON daily_digests
-- FOR SELECT USING (
--   EXISTS (
--     SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
--   )
-- ); -- Adapt for orgs/memberships
-- NOTE: Writes to this table might be handled by backend functions/triggers, not direct user interaction.