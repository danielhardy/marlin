-- 05_rules.sql

CREATE TABLE rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    match jsonb NOT NULL, -- Flexible matching criteria (e.g., {"description_contains": "UPS", "amount_greater_than": 10})
    category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE, -- If category is deleted, delete the rule? Or SET NULL? Cascade seems reasonable.
    auto BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = automatically apply category, FALSE = suggest category
    priority INTEGER DEFAULT 0 NOT NULL, -- To handle conflicting rules, lower number = higher priority
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for lookups by business
CREATE INDEX idx_rules_business_id ON rules(business_id);
-- GIN index for searching within the JSONB 'match' criteria efficiently
CREATE INDEX idx_rules_match ON rules USING GIN (match);
-- Index category reference
CREATE INDEX idx_rules_category_id ON rules(category_id);


-- RLS: Check ownership via the linked business
-- ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage rules for their businesses" ON rules
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
--   )
-- ); -- Adapt for orgs/memberships