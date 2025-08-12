# Marlin Supabase

This directory contains the Supabase configuration for the Marlin application, including database migrations, and serverless functions.

## Overview

Supabase is used as the primary database and for serverless functions. The database schema is managed through migration files, and the serverless functions are written in TypeScript.

## Getting Started

### Prerequisites

-   [Supabase CLI](https://supabase.com/docs/guides/cli)

### Running Supabase Locally

1.  Navigate to the `supabase` directory:
    ```bash
    cd supabase
    ```
2.  Start the local Supabase stack:
    ```bash
    supabase start
    ```
This will start the Supabase services, including the database, and apply all the migrations.

To stop the local Supabase stack:
```bash
supabase stop
```

## Database Schema

The database schema is defined by the migration files in the `migrations` directory. Here is a summary of the main tables:

### Core Tables

-   **`users`**: Stores user profile information.
-   **`businesses`**: Represents a user's business.
-   **`memberships`**: Links users to businesses with a specific role (e.g., owner, admin).

### Plaid Integration

-   **`plaid_items_raw`**: Stores the raw item data from Plaid, with the `access_token` encrypted.
-   **`plaid_items`**: A view that provides decrypted access to the `plaid_items_raw` table.
-   **`bank_accounts`**: Stores bank accounts linked to a business through Plaid.
-   **`transactions`**: Stores all financial transactions fetched from Plaid.

### Financial Management

-   **`categories`**: User-defined categories for classifying transactions.
-   **`rules`**: Rules for automatically categorizing transactions based on patterns.
-   **`receipts`**: Stores uploaded receipts and links them to transactions.
-   **`invoices`**: Stores invoices for billing customers.
-   **`invoice_items`**: Stores individual items on an invoice.
-   **`daily_digests`**: Stores a daily summary of financial activity.
-   **`tax_vaults`**: Configures settings for tax calculations.

### Enums

-   **`invoice_status`**: `draft`, `sent`, `paid`, `void`, `overdue`
-   **`transaction_status`**: `pending`, `posted`, `reviewed`, `deleted`, `cleared`

## Supabase Functions

The serverless functions are located in the `functions` directory.

-   **`classify_new_tx`**: This function is likely responsible for classifying new transactions as they are created.
-   **`classify_tx`**: This function is likely responsible for classifying a single transaction.
-   **`pull_plaid_tx`**: This function is responsible for pulling new transactions from Plaid for linked items.

## Encryption

The `access_token` in the `plaid_items_raw` table is encrypted using `pgp_sym_encrypt`. A view `plaid_items` is provided to decrypt the token for use in the application. The trigger functions `plaid_items_insert_tr`, `plaid_items_update_tr`, and `plaid_items_delete_tr` handle the encryption on data manipulation. The RPC function `rpc_upsert_plaid_item` also handles encryption when upserting Plaid items.
