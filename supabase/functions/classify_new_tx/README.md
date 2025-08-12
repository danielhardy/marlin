# Supabase Function: `classify_new_tx`

This function is responsible for automatically classifying new transactions that do not have a category assigned. It is designed to be run on a schedule (e.g., via a cron job).

## Purpose

The function fetches a batch of unclassified transactions from the `transactions` table. For each transaction, it uses an AI agent (Obru-AI) to determine the most appropriate category from the business's list of categories. It then updates the transaction with the suggested category and a confidence score.

## How it Works

1.  **Fetch Unclassified Transactions**: The function queries the database for transactions where `category_id` is `NULL`.
2.  **Process Transactions in a Loop**: For each transaction:
    a.  **Get Business Categories**: It fetches the list of available categories for the transaction's business.
    b.  **Invoke AI Agent**: It constructs a prompt with the transaction details (description, amount, merchant name) and sends it to an AI agent.
    c.  **Parse AI Response**: The AI agent returns a suggested category and a confidence score.
    d.  **Update Transaction**: The function updates the transaction in the database with the new `category_id` and `ai_confidence`.

## Environment Variables

This function requires the following environment variables to be set in your Supabase project:

-   `SUPABASE_URL`: The URL of your Supabase project.
-   `SUPABASE_SERVICE_ROLE_KEY`: The service role key for your Supabase project.
-   `OPENAI_API_KEY`: Your API key for the OpenAI service.

These can be set locally in a `.env` file in the `supabase` directory, or in the Supabase project settings for deployment.

## Running Locally

To serve the function locally for testing:

```bash
supabase functions serve classify_new_tx --no-verify-jwt
```

You can then invoke the function by sending a POST request to `http://localhost:54321/functions/v1/classify_new_tx`.

## Debugging

You can add `console.log` statements to the function code to inspect variables and flow. When running `supabase functions serve`, the output will be streamed to your terminal.

## Deployment

To deploy the function to your Supabase project:

```bash
supabase functions deploy classify_new_tx
```

After deployment, you will need to set the required environment variables in the Supabase project settings.

## Scheduling

To run this function on a schedule, you can use the `pg_cron` extension in Supabase to call the function at a regular interval. For example, to run it every hour:

```sql
SELECT cron.schedule('classify-new-transactions', '0 * * * *', 'SELECT net.http_post(url:=''https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/classify_new_tx'', headers:=''{"Authorization": "Bearer <YOUR-SERVICE-ROLE-KEY>"}'')');
```
