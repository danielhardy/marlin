-- 07_invoice_items.sql

CREATE TABLE invoice_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, -- Items deleted if invoice is deleted
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0), -- Use NUMERIC if fractional quantities allowed
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    -- total_price NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED, -- Optional generated column
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for quick lookup of items by invoice
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- RLS: Inherit access from the parent invoice
-- ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage invoice items for their businesses' invoices" ON invoice_items
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM invoices i
--     JOIN businesses b ON i.business_id = b.id
--     WHERE i.id = invoice_id AND b.owner_id = auth.uid()
--   )
-- ); -- Adapt for orgs/memberships