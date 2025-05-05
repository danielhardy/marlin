-- 08_receipts.sql

CREATE TABLE receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    storage_path TEXT UNIQUE NOT NULL, -- Path in Supabase Storage (e.g., 'business_uuid/receipt_uuid.pdf');
    transaction_id uuid NULL REFERENCES transactions(id) ON DELETE SET NULL, -- Link to transaction, allow NULL if unlinked or transaction deleted;
    -- uploaded_by uuid NOT NULL REFERENCES users(id), -- Link to the user who uploaded it;
    uploaded_by uuid NOT NULL REFERENCES auth.users(id), -- More typical Supabase approach;
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    parsed_total NUMERIC(15, 2), -- Extracted from OCR/parsing;
    parsed_date DATE, -- Extracted from OCR/parsing;
    parsed_vendor TEXT, -- Extracted vendor name
    -- ocr_status TEXT DEFAULT 'pending', -- e.g., 'pending', 'processing', 'complete', 'failed'
    file_name TEXT, -- Original file name
    content_type TEXT -- e.g., 'application/pdf', 'image/jpeg'
);

-- Indices
CREATE INDEX idx_receipts_business_id ON receipts(business_id);
CREATE INDEX idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX idx_receipts_uploaded_by ON receipts(uploaded_by);
CREATE INDEX idx_receipts_uploaded_at ON receipts(uploaded_at);

-- RLS: Check ownership via the linked business
-- ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage receipts for their businesses" ON receipts
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
--   )
-- ); -- Adapt for orgs/memberships