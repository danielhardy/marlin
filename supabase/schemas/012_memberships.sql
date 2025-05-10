-- 02_memberships.sql
-- Links authenticated users to businesses with a defined role.

CREATE TABLE memberships (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),       -- unique membership record
    user_id       uuid        NOT NULL
                         REFERENCES auth.users(id),                        -- Supabase auth user
    business_id   uuid        NOT NULL
                         REFERENCES businesses(id)                         -- your businesses table
                         ON DELETE CASCADE,
    role          text        NOT NULL,                                     -- e.g. owner, admin, employee
    created_at    timestamptz NOT NULL DEFAULT now()                        -- record creation time
);

-- Indexes for common lookups
CREATE INDEX idx_memberships_user_id
    ON memberships(user_id);

CREATE INDEX idx_memberships_business_id
    ON memberships(business_id);

-- -- Supabase RLS Policy Example (adapt as needed)
-- -- Enable Row Level Security
-- ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- -- Allow users to view their own memberships
-- CREATE POLICY "Users can view their memberships"
--     ON memberships
--     FOR SELECT
--     USING ( auth.uid() = user_id );

-- -- Allow users to insert memberships tied to themselves
-- CREATE POLICY "Users can create their own membership"
--     ON memberships
--     FOR INSERT
--     WITH CHECK ( auth.uid() = user_id );

-- -- Prevent updates/deletes by anyone other than the membership owner
-- CREATE POLICY "Users can manage their own membership"
--     ON memberships
--     FOR UPDATE, DELETE
--     USING ( auth.uid() = user_id );
