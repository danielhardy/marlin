// supabase/functions/classify_new_transactions/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2.49.3";

// --- Obru-AI imports via JSR registry ---
// import { Agent } from "jsr:danielhardy/obru-ai@main";
// import type { Tool as ObruTool } from "jsr:danielhardy/obru-ai@main/types";
import { Agent } from "https://raw.githubusercontent.com/danielhardy/obru-ai/refs/heads/main/src/index.ts";
import type { Tool as ObruTool } from "https://raw.githubusercontent.com/danielhardy/obru-ai/refs/heads/main/src/types.ts"; // Assuming type export

// --- Initialize Supabase admin client ---
const supabaseAdmin: SupabaseClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// --- Configuration ---
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
if (!OPENAI_API_KEY) {
  console.error("FATAL: OPENAI_API_KEY is not set.");
}

const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_TEMPERATURE = 0.2;

// --- Types ---
interface RawTransaction {
  id: string;
  business_id: string;
  description: string;
  amount: number;
  merchant_name: string | null;
}

// --- Helper: fetch category names for a business ---
async function getBusinessCategories(businessId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("name")
    .eq("business_id", businessId)
    .order("name");

  if (error) {
    console.error(
      `Error fetching categories for business ${businessId}:`,
      error
    );
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(
      `No categories found for business ${businessId}. Using default list.`
    );
    return [
      "Office Supplies",
      "Meals & Entertainment",
      "Travel",
      "Software",
      "Utilities",
      "Other Expenses",
      "Professional Fees",
      "Hardware",
    ];
  }

  return data.map((c: { name: string }) => c.name);
}

// --- Helper: create Obru tool for classification ---
function createClassificationTool(categories: string[]): ObruTool {
  const categoryEnumDescription = categories.join(", ");
  return {
    name: "submitTransactionClassification",
    description: `Submits the transaction classification. The 'category' must be one of: ${categoryEnumDescription}.`,
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: `The classified category for the transaction. Must be one of: ${categoryEnumDescription}.`,
        },
        confidence: {
          type: "number",
          description:
            "The confidence score of the classification, from 0.0 (low) to 1.0 (high).",
        },
      },
      required: ["category", "confidence"],
    },
    execute: async (args: Record<string, any>) => {
      if (!categories.includes(args.category)) {
        console.warn(
          `Tool received category "${args.category}" not in allowed list: ${categoryEnumDescription}.`
        );
      }
      return JSON.stringify(args);
    },
  };
}

// --- Helper: build the system prompt ---
function createClassifierBasePrompt(categories: string[]): string {
  const categoryListString = categories.join(", ");
  return `
You are an expert bookkeeping assistant AI. Your task is to categorize financial transactions.
Given a transaction description, merchant name (if available), and amount, you MUST classify the transaction.

To provide your classification, you MUST use the "submitTransactionClassification" tool.
The "category" parameter for the tool must be EXACTLY ONE category from the following list:
${categoryListString}.

The "confidence" parameter for the tool must be a numerical score between 0.0 (not confident) and 1.0 (very confident).

Example of input:
"Description: Office Coffee Supplies
Amount: 25.99
Merchant: Starbucks"

Based on this, choose a category and confidence, then call the "submitTransactionClassification" tool.
If unsure, pick the most plausible from the list and assign confidence < 0.6.
If none fits, use a general category like "Other Expenses" and assign 0.1.
Do not produce any other text—only call the tool.
`.trim();
}

// --- Main Entrypoint: run on cron to classify new transactions ---
Deno.serve(async (_req: Request) => {
  try {
    // 1. Fetch all transactions that have not been classified yet
    //    (i.e., where category_id is null or status indicates 'pending')
    const { data: pendingTxs, error: fetchError } = await supabaseAdmin
      .from("transactions")
      .select("id, business_id, description, amount, merchant_name")
      .is("category_id", null)
      .limit(50); // Optional: batch size per run

    if (fetchError) {
      console.error("Error fetching unclassified transactions:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!pendingTxs || pendingTxs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new transactions to classify." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Process each transaction one by one
    const results: Array<{
      transaction_id: string;
      classified_category: string;
      ai_confidence: number;
      status: "updated" | "skipped" | "error";
      error_message?: string;
    }> = [];

    for (const tx of pendingTxs as RawTransaction[]) {
      try {
        const {
          id: transactionId,
          business_id,
          description,
          amount,
          merchant_name,
        } = tx;

        // 2a. Retrieve that business's category list
        const categories = await getBusinessCategories(business_id);

        // 2b. Build classification tool & prompt
        const classificationTool = createClassificationTool(categories);
        const basePrompt = createClassifierBasePrompt(categories);

        // 2c. Instantiate Obru agent
        const agent = new Agent({
          openaiKey: OPENAI_API_KEY!,
          modelName: DEFAULT_MODEL,
          systemPrompt: basePrompt,
          tools: [classificationTool],
          temperature: DEFAULT_TEMPERATURE,
        });

        // 2d. Format the user input string
        const userInputString = `Description: ${description}\nAmount: ${amount}${
          merchant_name ? `\nMerchant: ${merchant_name}` : ""
        }`;

        // 2e. Run the agent to get a JSON string from our tool’s execute()
        const rawResponseFromTool = await agent.run(userInputString);

        // 2f. Parse the JSON response
        let suggestedCategoryName: string;
        let aiConfidence: number;
        try {
          const parsed = JSON.parse(rawResponseFromTool.trim());
          suggestedCategoryName = parsed.category;
          aiConfidence = parseFloat(parsed.confidence);

          if (
            !suggestedCategoryName ||
            typeof aiConfidence !== "number" ||
            aiConfidence < 0 ||
            aiConfidence > 1
          ) {
            throw new Error(
              "Invalid JSON structure or values from AI tool response."
            );
          }
          // Ensure the selected category exists
          if (!categories.includes(suggestedCategoryName)) {
            console.warn(
              `AI returned category "${suggestedCategoryName}" which is not in list. Falling back.`
            );
            const fallback =
              categories.find((c) => c.toLowerCase().includes("other")) ||
              categories.find((c) => c.toLowerCase().includes("miscellaneous"));
            suggestedCategoryName =
              fallback || categories[0] || "Uncategorized";
            aiConfidence = Math.min(aiConfidence, 0.2);
          }
        } catch (parseError) {
          console.error(
            "Failed to parse JSON response from AI tool:",
            parseError,
            "Raw response:",
            rawResponseFromTool
          );
          const fallback =
            categories.find((c) => c.toLowerCase().includes("other")) ||
            categories.find((c) => c.toLowerCase().includes("miscellaneous"));
          suggestedCategoryName = fallback || "Needs Review";
          aiConfidence = 0.05;
        }

        // 2g. Look up the actual category ID
        const { data: categoryData, error: categoryError } = await supabaseAdmin
          .from("categories")
          .select("id")
          .eq("business_id", business_id)
          .eq("name", suggestedCategoryName)
          .single();

        if (categoryError || !categoryData) {
          console.error(
            `Could not find category ID for "${suggestedCategoryName}" (business ${business_id}):`,
            categoryError
          );
          results.push({
            transaction_id: transactionId,
            classified_category: suggestedCategoryName,
            ai_confidence: aiConfidence,
            status: "skipped",
            error_message: `Category lookup failed: ${
              categoryError?.message || "no data"
            }`,
          });
          continue;
        }
        const categoryId = categoryData.id;

        // 2h. Update this transaction with the AI classification
        const { error: updateError } = await supabaseAdmin
          .from("transactions")
          .update({
            category_id: categoryId,
            ai_confidence: aiConfidence,
            status: "classified_by_ai_tool",
          })
          .eq("id", transactionId)
          .eq("business_id", business_id);

        if (updateError) {
          console.error(
            `Failed to update transaction ${transactionId}:`,
            updateError
          );
          results.push({
            transaction_id: transactionId,
            classified_category: suggestedCategoryName,
            ai_confidence: aiConfidence,
            status: "error",
            error_message: `DB update failed: ${updateError.message}`,
          });
          continue;
        }

        results.push({
          transaction_id: transactionId,
          classified_category: suggestedCategoryName,
          ai_confidence: aiConfidence,
          status: "updated",
        });
      } catch (txError) {
        console.error(
          `Unhandled error classifying transaction ${tx.id}:`,
          txError
        );
        results.push({
          transaction_id: tx.id,
          classified_category: "N/A",
          ai_confidence: 0,
          status: "error",
          error_message:
            txError instanceof Error ? txError.message : String(txError),
        });
      }
    }

    // 3. Return a summary of what happened
    return new Response(
      JSON.stringify({
        message: "Batch classification complete.",
        processed_count: pendingTxs.length,
        details: results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Fatal error in classify_new_transactions:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unexpected error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
