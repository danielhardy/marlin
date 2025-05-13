/**
 * Represents the status of a transaction.
 * Corresponds to the 'transaction_status' enum in the SQL schema.
 */
export type TransactionStatus = "pending" | "posted" | "cancelled" | "failed"; // Example statuses, adjust if your enum has others

/**
 * Represents the raw transaction details from Plaid.
 * This interface is updated to reflect the structure of the provided JSON example.
 * See Plaid documentation for full details: https://plaid.com/docs/api/transactions/#transactionsget-response-transactions
 */
export interface PlaidRawDetails {
  account_id: string;
  account_owner: string | null;
  amount: number; // Positive = credit, negative = debit
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
  category: string[] | null; // Plaid category path (can be null based on example)
  category_id: string | null; // Plaid category ID (can be null based on example)
  date: string; //-MM-DD format
  authorized_date: string | null; //-MM-DD format
  authorized_datetime: string | null; // ISO 8601 format
  datetime: string | null; // ISO 8601 format
  location: {
    address: string | null;
    city: string | null;
    region: string | null;
    postal_code: string | null;
    country: string | null;
    lat: number | null;
    lon: number | null;
    store_number: string | null;
  } | null;
  name: string; // Transaction name
  merchant_name: string | null; // Merchant name from Plaid
  original_description: string | null;
  payment_channel: string; // e.g., 'online', 'in store', 'other'
  payment_meta: {
    by_order_of: string | null;
    payee: string | null;
    payer: string | null;
    payment_method: string | null; // e.g., 'ACH', 'wire', 'check', 'online', 'in store'
    payment_processor: string | null; // e.g., 'stripe', 'paypal'
    ppd_id: string | null; // ACH PPD ID
    reason: string | null;
    reference_number: string | null;
  } | null;
  pending: boolean;
  pending_transaction_id: string | null;
  account_balance?: {
    // Marked as optional as it wasn't in the provided example
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
    unofficial_currency_code: string | null;
  } | null;
  transaction_id: string; // Plaid transaction ID
  transaction_code: string | null; // e.g., 'adjustment', 'atm', 'bank charge'
  transaction_type: string; // e.g., 'digital', 'place', 'special', 'unresolved'

  // Fields added based on the provided JSON example
  website: string | null;
  logo_url: string | null;
  check_number: string | null; // Assuming string based on common usage, though example is null
  counterparties: Array<{
    // Array of objects representing involved parties
    name: string | null;
    type: string | null; // e.g., 'merchant', 'financial institution'
    website: string | null;
    logo_url: string | null;
    entity_id: string | null;
    phone_number: string | null;
    confidence_level: string | null; // e.g., 'VERY_HIGH', 'HIGH', 'MEDIUM'
  }> | null; // Can be null based on example
  merchant_entity_id: string | null;
  personal_finance_category: {
    primary: string | null;
    detailed: string | null;
    confidence_level: string | null; // e.g., 'VERY_HIGH', 'HIGH', 'MEDIUM'
  } | null; // Can be null based on example
  personal_finance_category_icon_url: string | null;
}

/**
 * Represents a transaction record in the database.
 * Corresponds to the 'transactions' table schema.
 */
export interface Transaction {
  id: string; // UUID
  business_id: string; // UUID
  item_id: string; // UUID
  bank_account_id: string; // UUID
  plaid_transaction_id: string; // TEXT, UNIQUE
  date_posted: string; // DATE (using string for-MM-DD format)
  amount: number; // NUMERIC(15,2) - Positive = credit, negative = debit
  iso_currency_code: string; // TEXT - e.g. 'USD'
  name: string | null; // TEXT - e.g. merchant name or description
  merchant_name: string | null; // TEXT - raw merchant name from Plaid
  raw_details: PlaidRawDetails; // JSONB - full Plaid transaction object
  pending: boolean; // BOOLEAN
  category_id: string | null; // UUID, NULLABLE, REFERENCES categories(id)
  ai_confidence: number | null; // REAL, NULLABLE
  status: TransactionStatus; // transaction_status enum
  synced_at: string; // TIMESTAMPTZ (using string for ISO 8601 format)
  created_at: string; // TIMESTAMPTZ (using string for ISO 8601 format)
  reviewed_at: string | null; // TIMESTAMPTZ, NULLABLE
}
