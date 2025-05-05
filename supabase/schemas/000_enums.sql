-- enums.sql

-- Define status enum for transactions
CREATE TYPE transaction_status AS ENUM ('pending', 'cleared');

-- Define status enum for invoices (can be expanded)
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'void', 'overdue');