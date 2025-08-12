# Supabase Function: `classify_tx`

This function is responsible for classifying a single transaction using an AI agent. It is designed to be called on-demand, for example, from the backend when a new transaction needs immediate classification.

## Purpose

The function takes a transaction's details as input, uses an AI agent (Obru-AI) to determine the most appropriate category, and then updates the transaction in the database with the suggested category and a confidence score.

## How it Works

1.  **Receive Transaction Data**: The function expects a POST request with a JSON body containing the transaction details (`transaction_id`, `business_id`, `description`, `amount`, `merchant_name`).
2.  **Get Business Categories**: It fetches the list of available categories for the transaction's business.
3.  **Invoke AI Agent**: It constructs a prompt with the transaction details and sends it to an AI agent.
4.  **Parse AI Response**: The AI agent returns a suggested category and a confidence score.
5.  **Update Transaction**: The function updates the transaction in the database with the new `category_id` and `ai_confidence`.

## Environment Variables

This function requires the following environment variables to be set in your Supabase project:

-   `SUPABASE_URL`: The URL of your Supabase project.
-   `SUPABASE_SERVICE_ROLE_KEY`: The service role key for your Supabase project.
-   `OPENAI_API_KEY`: Your API key for the OpenAI service.

These can be set locally in a `.env` file in the `supabase` directory, or in the Supabase project settings for deployment.

## Running Locally

To serve the function locally for testing:

```bash
supabase functions serve classify_tx --no-verify-jwt
```

You can then invoke the function by sending a POST request to `http://localhost:54321/functions/v1/classify_tx` with a JSON body like this:

```json
{
  "transaction_id": "...",
  "business_id": "...",
  "description": "...",
  "amount": 12.34,
  "merchant_name": "..."
}
```

## Debugging

You can add `console.log` statements to the function code to inspect variables and flow. When running `supabase functions serve`, the output will be streamed to your terminal.

## Deployment

To deploy the function to your Supabase project:

```bash
supabase functions deploy classify_tx
```

After deployment, you will need to set the required environment variables in the Supabase project settings.
