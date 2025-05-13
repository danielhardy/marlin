-- 02_bank_accounts.sql

CREATE TABLE bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    plaid_account_id TEXT UNIQUE NOT NULL, -- Ensure this is unique across all accounts
    name TEXT NOT NULL,
    mask TEXT, -- Last 4 digits
    type TEXT, -- e.g., 'checking', 'savings' - consider an ENUM?
    -- subtype TEXT, -- Plaid provides subtype, might be useful e.g., 'cd', 'money market'
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Use NUMERIC/DECIMAL for money
    -- currency_code TEXT DEFAULT 'USD' NOT NULL, -- Store currency explicitly
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL, -- last_synced_at TIMESTAMPTZ -- Track Plaid sync status
    subtype TEXT, -- Plaid provides subtype, might be useful e.g., 'cd', 'money market'
    official_name TEXT, -- Official name of the account
    currency_code TEXT DEFAULT 'USD' NOT NULL, -- Store currency explicitly
    available_balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL, -- Use NUMERIC/DECIMAL for money
    credit_limit NUMERIC(15, 2) DEFAULT 0.00 NOT NULL -- Use NUMERIC/DECIMAL for money
);

-- Index for lookups by business
CREATE INDEX idx_bank_accounts_business_id ON bank_accounts(business_id);
-- Index for plaid id lookup (covered by UNIQUE constraint but good practice)
CREATE INDEX idx_bank_accounts_plaid_account_id ON bank_accounts(plaid_account_id);

-- RLS: Check ownership via the linked business
-- ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage bank accounts for their businesses" ON bank_accounts
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
--   )
-- ); -- Adapt for orgs/memberships