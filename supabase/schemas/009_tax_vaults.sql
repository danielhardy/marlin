-- 09_tax_vaults.sql

CREATE TABLE tax_vaults (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Only one vault setting per business
    business_id uuid UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    -- Destination account can be optional or required based on feature logic
    destination_bank_account_id uuid NULL REFERENCES bank_accounts(id) ON DELETE SET NULL, -- Don't delete vault if account is deleted
    sales_tax_rate NUMERIC(5, 4) CHECK (sales_tax_rate >= 0 AND sales_tax_rate <= 1), -- e.g., 0.06 for 6%
    income_tax_rate NUMERIC(5, 4) CHECK (income_tax_rate >= 0 AND income_tax_rate <= 1), -- e.g., 0.20 for 20%
    last_sweep_at TIMESTAMPTZ,
    is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL -- Track changes
);

-- Index for lookups by business (covered by UNIQUE, but good practice)
CREATE INDEX idx_tax_vaults_business_id ON tax_vaults(business_id);
CREATE INDEX idx_tax_vaults_destination_bank_account_id ON tax_vaults(destination_bank_account_id);


-- RLS: Check ownership via the linked business
-- ALTER TABLE tax_vaults ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage tax vaults for their businesses" ON tax_vaults
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
--   )
-- ); -- Adapt for orgs/memberships