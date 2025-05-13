-- 04_transactions.sql
-- This used to be 04 but was moved to 014_transactions.sql so it comes after plaid_items.sql

-- 1. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id                        UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id               UUID                NOT NULL REFERENCES businesses(id)        ON DELETE CASCADE,
    item_id                   UUID                NOT NULL REFERENCES plaid_items(id)       ON DELETE CASCADE,
    bank_account_id           UUID                NOT NULL REFERENCES bank_accounts(id)     ON DELETE CASCADE,
    plaid_transaction_id      TEXT                NOT NULL UNIQUE,
    date_posted               DATE                NOT NULL,
    amount                    NUMERIC(15,2)       NOT NULL,   -- Positive = credit, negative = debit
    iso_currency_code         TEXT                NOT NULL,   -- e.g. 'USD'
    name                      TEXT,                          -- e.g. merchant name or description
    merchant_name             TEXT,                          -- raw merchant name from Plaid
    raw_details               JSONB               NOT NULL,   -- full Plaid transaction object
    pending                   BOOLEAN             NOT NULL DEFAULT FALSE,
    category_id               UUID                NULL REFERENCES categories(id)           ON DELETE SET NULL,
    ai_confidence             REAL,                          -- probability from your ML classifier
    status                    transaction_status  NOT NULL DEFAULT 'pending',
    synced_at                 TIMESTAMPTZ         NOT NULL DEFAULT now(),  -- when this record was inserted/updated from Plaid
    created_at                TIMESTAMPTZ         NOT NULL DEFAULT now(),
    reviewed_at               TIMESTAMPTZ                    -- when user confirmed/edited the category
);

-- 2. Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_transactions_business_id     ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_item_id         ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account_id ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date_posted      ON transactions(date_posted);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id     ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status          ON transactions(status);


-- RLS: Check ownership via the linked business
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage transactions for their businesses" ON transactions
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
--   )
-- ); -- Adapt for orgs/memberships