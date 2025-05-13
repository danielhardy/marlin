-- 011_plaid_items.sql
-- This SQL script creates a table for storing Plaid item information.

CREATE TABLE IF NOT EXISTS plaid_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL
    REFERENCES businesses(id)
    ON DELETE CASCADE,            -- if a business is removed, its items go too
  item_id TEXT NOT NULL
    UNIQUE,                       -- Plaid’s own item_id must be unique
  access_token TEXT NOT NULL,     -- securely store the Plaid access token
  cursor TEXT,                    -- optional cursor for pagination
  last_synced_at TIMESTAMPTZ,     -- last time the item was synced
  active BOOLEAN DEFAULT TRUE,    -- whether the item is active
  created_at TIMESTAMPTZ NOT NULL 
   DEFAULT NOW(),                 -- record when this record was created
    last_failed_at TIMESTAMPTZ,   -- last time the item sync failed
    institution_id TEXT,          -- Plaid institution ID
    institution_name TEXT,        -- name of the institution
    products TEXT[]            -- array of products linked to this item
);

-- Optional: index on business_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_plaid_items_business_id
  ON plaid_items (business_id);
