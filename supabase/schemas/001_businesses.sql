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



-- Create a trigger to automatically create a membership when a business is created
-- CREATE OR REPLACE FUNCTION create_membership_on_business_insert()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO memberships (user_id, business_id, role)
--   VALUES (NEW.owner_id, NEW.id, 'owner');
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER business_membership_trigger
-- AFTER INSERT ON businesses
-- FOR EACH ROW
-- EXECUTE FUNCTION create_membership_on_business_insert();