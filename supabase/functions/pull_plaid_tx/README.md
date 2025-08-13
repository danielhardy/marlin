# Supabase Function: `pull_plaid_tx`

This function is responsible for pulling the latest transactions from Plaid for all active Plaid items in the system. It is designed to be run on a schedule (e.g., via a cron job).

## Purpose

The function fetches all active Plaid items from the `plaid_items` table. For each item, it uses the Plaid API to fetch new, updated, and removed transactions since the last sync. It then updates the `transactions` table in the database accordingly.

## How it Works

1.  **Fetch Active Plaid Items**: The function queries the database for all Plaid items where `active` is `true`.
2.  **Process Items in a Loop**: For each Plaid item:
    a.  **Fetch Transactions from Plaid**: It calls the Plaid API's `/transactions/sync` endpoint with the item's `access_token` and the last known `cursor`.
    b.  **Upsert Transactions**: It upserts the new and modified transactions into the `transactions` table.
    c.  **Delete Transactions**: It deletes any transactions that have been removed in Plaid.
    d.  **Update Cursor**: It updates the `cursor` and `last_synced_at` timestamp for the Plaid item in the database.

## Environment Variables

This function requires the following environment variables to be set in your Supabase project:

-   `SUPABASE_URL`: The URL of your Supabase project.
-   `SUPABASE_SERVICE_ROLE_KEY`: The service role key for your Supabase project.
-   `PLAID_CLIENT_ID`: Your Plaid client ID.
-   `PLAID_SECRET`: Your Plaid secret.
-   `PLAID_ENV`: The Plaid environment to use (`sandbox`, `development`, or `production`).

These can be set locally in a `.env` file in the `supabase` directory, or in the Supabase project settings for deployment.

## Running Locally

To serve the function locally for testing:

```bash
supabase functions serve pull_plaid_tx --no-verify-jwt
```

You can then invoke the function by sending a POST request to `http://localhost:54321/functions/v1/pull_plaid_tx`.

## Testing with cURL

You can also use cURL to test the function locally. Make sure to replace `<YOUR TOKEN HERE>` with a valid JWT for your Supabase project.

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/pull_plaid_tx' \
    --header 'Authorization: Bearer <YOUR TOKEN HERE>' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'
```

## Debugging

You can add `console.log` statements to the function code to inspect variables and flow. When running `supabase functions serve`, the output will be streamed to your terminal.

## Deployment

To deploy the function to your Supabase project:

```bash
supabase functions deploy pull_plaid_tx
```

After deployment, you will need to set the required environment variables in the Supabase project settings.

## Scheduling

To run this function on a schedule, you can use the `pg_cron` extension in Supabase to call the function at a regular interval. For example, to run it every hour:

```sql
SELECT cron.schedule('pull-plaid-transactions', '0 * * * *', 'SELECT net.http_post(url:=''https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/pull_plaid_tx'', headers:=''{"Authorization": "Bearer <YOUR-SERVICE-ROLE-KEY>"}'')');
```