-- 01_businesses.sql

CREATE TABLE businesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Link to your users/profiles table PK
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT, -- More typical Supabase approach
    legal_name TEXT NOT NULL,
    tax_id TEXT, -- Consider encrypting this
    country TEXT, -- Consider using country codes (e.g., ISO 3166-1 alpha-2)
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for quick lookup of businesses by owner
CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);

-- RLS: Ensure users can only interact with businesses they own (or are members of, see improvements)
-- ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage their own businesses" ON businesses
-- FOR ALL USING (auth.uid() = owner_id); -- This needs modification for orgs/memberships