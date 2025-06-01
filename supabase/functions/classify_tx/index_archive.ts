// supabase/functions/classify_tx/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2.49.3";
// Correct import based on esm.sh and Obru-AI docs (Agent class)
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
  // Consider how to handle this in a serverless function;
  // often, if a critical config is missing, you'd want the function to fail clearly.
}

const DEFAULT_MODEL = "gpt-4o"; // Or your preferred model, e.g., "gpt-4" as in Obru-AI docs
const DEFAULT_TEMPERATURE = 0.2; // Lower temperature for more deterministic classification
// --- Types ---
export interface Category {
  id?: string;
  business_id?: string;
  parent_id?: string | null;
  name?: string;
  schedule_c_code?: string | null;
  is_system?: boolean;
  created_at?: string;
}

// --- Helper Functions ---
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
      `No categories found for business ${businessId}. Using a default list.`
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
  return data.map((c: Category) => c.name);
}

/**
 * Creates a classification tool for the Obru Agent.
 * The AI will be instructed to call this tool with its classification.
 */
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
          // If Obru-AI's tool schema supported 'enum', we'd use it here:
          // enum: categories,
        },
        confidence: {
          type: "number",
          description:
            "The confidence score of the classification, from 0.0 (low) to 1.0 (high).",
        },
      },
      required: ["category", "confidence"],
    },
    execute: async (args: { category: string; confidence: number }) => {
      // This function is called by the Obru Agent when the LLM decides to use the tool.
      // 'args' will contain the structured data { category, confidence }.
      // Since execute must return a string, we stringify the args.
      // This stringified JSON will be the final output of agent.processInput() in this scenario.
      if (!categories.includes(args.category)) {
        console.warn(
          `Tool received category "${args.category}" not in allowed list: ${categoryEnumDescription}. This might indicate the LLM didn't follow enum instructions perfectly.`
        );
        // Potentially clamp or adjust args.category here if needed, or rely on later validation.
      }
      return JSON.stringify(args);
    },
  };
}

/**
 * Creates a base prompt that instructs the AI to use the classification tool.
 */
function createClassifierBasePrompt(categories: string[]): string {
  const categoryListString = categories.join(", ");
  return `
You are an expert bookkeeping assistant AI. Your task is to categorize financial transactions.
Given a transaction description, merchant name (if available), and amount, you MUST classify the transaction.

To provide your classification, you MUST use the "submitTransactionClassification" tool.
The "category" parameter for the tool must be EXACTLY ONE category from the following list:
${categoryListString}.

The "confidence" parameter for the tool must be a numerical score between 0.0 (not confident) and 1.0 (very confident).

Example of user input you will receive:
"Description: Office Coffee Supplies\nAmount: 25.99\nMerchant: Starbucks"

Based on this input, you would decide on the category and confidence, then call the "submitTransactionClassification" tool with those parameters.

If you are unsure about the category, pick the most plausible one from the list and assign a lower confidence score (e.g., less than 0.6).
If no category from the list seems remotely appropriate, you MUST use a general category like "Other Expenses" (if available in the list, otherwise pick the most general available one) as the 'category' for the tool and assign a very low confidence score (e.g., 0.1).
Do not respond with conversational text around the tool usage. Only use the tool.
`.trim();
}

// --- Main Edge Function ---
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let transactionId: string,
    businessId: string,
    description: string,
    amount: number,
    merchantName: string | null = null;

  try {
    const body = await req.json();
    transactionId = body.transaction_id;
    businessId = body.business_id;
    description = body.description;
    amount = body.amount;
    merchantName = body.merchant_name || null;

    if (
      !transactionId ||
      !businessId ||
      !description ||
      typeof amount !== "number"
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: transaction_id, business_id, description, or amount.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (err) {
    console.error("Failed to parse request JSON:", err);
    return new Response(
      JSON.stringify({
        error: `Invalid request body: ${
          err instanceof Error ? err.message : String(err)
        }`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const categories = await getBusinessCategories(businessId);
    const classificationTool = createClassificationTool(categories);
    const basePrompt = createClassifierBasePrompt(categories);

    const agent = new Agent({
      apiKey: OPENAI_API_KEY!,
      model: DEFAULT_MODEL,
      basePrompt: basePrompt,
      tools: [classificationTool],
      temperature: DEFAULT_TEMPERATURE,
      // logger: console, // Uncomment for debugging if needed in environments that support it
      // hooks: { // Useful for deeper debugging
      //   beforePrompt: (msgs) => console.debug("Sending messages to LLM:", JSON.stringify(msgs, null, 2)),
      //   afterResponse: (resp) => console.debug("Raw LLM ModelResponse:", JSON.stringify(resp, null, 2)),
      // },
    });

    const userInputString = `Description: ${description}\nAmount: ${amount}${
      merchantName ? `\nMerchant: ${merchantName}` : ""
    }`;

    // agent.processInput will return the stringified JSON from our tool's execute function
    const rawResponseFromTool = await agent.processInput(userInputString);

    let suggestedCategoryName: string;
    let aiConfidence: number;

    try {
      // The response should be the JSON string from our tool's execute method
      const parsedResponse = JSON.parse(rawResponseFromTool.trim());
      suggestedCategoryName = parsedResponse.category;
      aiConfidence = parseFloat(parsedResponse.confidence);

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
      // Validate if the category returned by the tool is in the business's list
      // (The tool's execute function could also do this, or the prompt more strongly,
      // but an additional check here is good for robustness)
      if (!categories.includes(suggestedCategoryName)) {
        console.warn(
          `AI tool returned category "${suggestedCategoryName}" which is not in the business's list for business ${businessId}. This indicates an LLM error in following tool parameter constraints. Mapping to a general category.`
        );
        const otherGeneralCategory =
          categories.find((c) => c.toLowerCase().includes("other")) ||
          categories.find((c) => c.toLowerCase().includes("miscellaneous"));
        suggestedCategoryName =
          otherGeneralCategory || categories[0] || "Uncategorized"; // Last resort
        aiConfidence = Math.min(aiConfidence, 0.2); // Further penalize confidence
      }
    } catch (parseError) {
      console.error(
        "Failed to parse JSON response from AI tool:",
        parseError,
        "Raw response:",
        rawResponseFromTool
      );
      // If the tool didn't return valid JSON (which it should), this is a significant issue.
      const otherGeneralCategory =
        categories.find((c) => c.toLowerCase().includes("other")) ||
        categories.find((c) => c.toLowerCase().includes("miscellaneous"));
      suggestedCategoryName = otherGeneralCategory || "Needs Review"; // Fallback category
      aiConfidence = 0.05; // Very low confidence due to parsing failure
    }

    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from("CATEGORIES")
      .select("id")
      .eq("business_id", businessId)
      .eq("name", suggestedCategoryName)
      .single();

    if (categoryError || !categoryData) {
      console.error(
        `Error fetching category ID for "${suggestedCategoryName}" for business ${businessId}:`,
        categoryError
      );
      return new Response(
        JSON.stringify({
          warning: `AI suggested category "${suggestedCategoryName}" but its ID could not be found. No DB update.`,
          ai_tool_raw_response: rawResponseFromTool,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const categoryId = categoryData.id;

    const { error: updateError } = await supabaseAdmin
      .from("TRANSACTIONS")
      .update({
        category_id: categoryId,
        ai_confidence: aiConfidence,
        status: "classified_by_ai_tool", // Updated status
      })
      .eq("id", transactionId)
      .eq("business_id", businessId);

    if (updateError) {
      console.error(
        `Failed to update transaction ${transactionId} for business ${businessId}:`,
        updateError
      );
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        transaction_id: transactionId,
        classified_category_name: suggestedCategoryName,
        category_id: categoryId,
        ai_confidence: aiConfidence,
        message: "Transaction classified via AI tool and updated successfully.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(
      `Overall classification error for TX ${transactionId}, Biz ${businessId}:`,
      err
    );
    return new Response(
      JSON.stringify({
        error:
          err instanceof Error ? err.message : "An unexpected error occurred.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
