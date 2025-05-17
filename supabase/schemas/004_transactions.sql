-- 05_transactions.sql

CREATE TABLE IF NOT EXISTS transactions (
    id                        UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id               UUID      NOT NULL 
                                   REFERENCES businesses(id)      ON DELETE CASCADE,
    item_id                   UUID      NOT NULL 
                                   REFERENCES plaid_items_raw(id) ON DELETE CASCADE,
    bank_account_id           UUID      NOT NULL 
                                   REFERENCES bank_accounts(id)  ON DELETE CASCADE,
    plaid_transaction_id      TEXT      NOT NULL UNIQUE,
    date_posted               DATE      NOT NULL,
    amount                    NUMERIC(15,2) NOT NULL,
    iso_currency_code         TEXT      NOT NULL,
    name                      TEXT,
    merchant_name             TEXT,
    raw_details               JSONB     NOT NULL,
    pending                   BOOLEAN   NOT NULL DEFAULT FALSE,
    category_id               UUID      NULL REFERENCES categories(id) ON DELETE SET NULL,
    ai_confidence             REAL,
    status                    transaction_status NOT NULL DEFAULT 'pending',
    synced_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at               TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_business_id     ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_item_id         ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account_id ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date_posted     ON transactions(date_posted);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id     ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status          ON transactions(status);
