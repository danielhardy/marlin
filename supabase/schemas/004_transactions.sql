-- 04_transactions.sql

CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE, -- Or SET NULL/RESTRICT if tx should survive account deletion? Cascade is often ok.
    -- plaid_transaction_id TEXT UNIQUE, -- Useful for preventing duplicates from Plaid sync
    date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL, -- Positive for income, negative for expense
    currency TEXT NOT NULL, -- e.g., 'USD', 'CAD'. Ensure consistency!
    raw_description TEXT,
    -- merchant_name TEXT, -- Often available from Plaid, useful for rules/display
    -- pending BOOLEAN DEFAULT FALSE, -- Alternative to 'status' enum if simpler
    category_id uuid NULL REFERENCES categories(id) ON DELETE SET NULL, -- Allow transactions to be uncategorized or category deleted
    ai_confidence REAL, -- Float type (REAL or DOUBLE PRECISION)
    status transaction_status NOT NULL DEFAULT 'pending', -- Use the ENUM type
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
    -- reviewed_at TIMESTAMPTZ NULL -- Track when a user confirmed/edited the category
);

-- Indices for common filtering/sorting
CREATE INDEX idx_transactions_business_id ON transactions(business_id);
CREATE INDEX idx_transactions_bank_account_id ON transactions(bank_account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_status ON transactions(status);
-- CREATE INDEX idx_transactions_plaid_transaction_id ON transactions(plaid_transaction_id);

-- RLS: Check ownership via the linked business
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage transactions for their businesses" ON transactions
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
--   )
-- ); -- Adapt for orgs/memberships