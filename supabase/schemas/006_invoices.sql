-- 06_invoices.sql

CREATE TABLE invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    -- customer_id uuid REFERENCES customers(id), -- Link to a dedicated customer table? See improvements.
    stripe_invoice_id TEXT UNIQUE, -- If using Stripe Invoicing
    invoice_number TEXT, -- App-generated invoice number, ensure uniqueness per business
    customer_name TEXT, -- Denormalized if no customer table
    customer_email TEXT, -- Denormalized if no customer table
    status invoice_status NOT NULL DEFAULT 'draft', -- Use the ENUM type
    currency TEXT NOT NULL DEFAULT 'USD', -- Invoice currency
    total_amount NUMERIC(15, 2) DEFAULT 0.00 NOT NULL, -- Calculated from items, stored for convenience
    amount_due NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE NOT NULL,
    due_date DATE,
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT unique_invoice_number_per_business UNIQUE (business_id, invoice_number)
);

-- Indices for common lookups
CREATE INDEX idx_invoices_business_id ON invoices(business_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
-- CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);

-- RLS: Check ownership via the linked business
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage invoices for their businesses" ON invoices
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
--   )
-- ); -- Adapt for orgs/memberships