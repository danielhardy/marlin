-- 03_categories.sql

CREATE TABLE categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    parent_id uuid NULL REFERENCES categories(id) ON DELETE SET NULL, -- Allow NULL for top-level categories
    name TEXT NOT NULL,
    schedule_c_code TEXT, -- Consider linking to a separate table of Schedule C codes if complex
    is_system BOOLEAN NOT NULL DEFAULT FALSE, -- Indicates if it's a default category
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Ensure category names are unique within a business (and under the same parent, if applicable)
    CONSTRAINT unique_category_name UNIQUE (business_id, parent_id, name)
);

-- Index for lookups by business
CREATE INDEX idx_categories_business_id ON categories(business_id);
-- Index for finding child categories
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- RLS: Check ownership via the linked business
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage categories for their businesses" ON categories
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
--   )
-- ); -- Adapt for orgs/memberships