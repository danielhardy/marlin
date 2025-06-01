// supabase/functions/classify_tx/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2.49.3";

// --- Corrected imports based on the Obru-AI README (via JSR) ---
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
  // In a real deployment, you might want to throw or return a 500 here.
}

const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_TEMPERATURE = 0.2;

// --- Types ---
export interface Category {
  id?: string;
  business_id?: string;
  parent_id?: string | null;
  name: string;
  schedule_c_code?: string | null;
  is_system?: boolean;
  created_at?: string;
}

// --- Helper: fetch list of category names ---
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

// --- Helper: create an Obru-AI tool for submitting classification ---
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

// --- Helper: build the system prompt for the agent ---
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
"Description: Office Coffee Supplies
Amount: 25.99
Merchant: Starbucks"

Based on this input, decide on the category and confidence, then call the "submitTransactionClassification" tool with those parameters.

If you are unsure about the category, pick the most plausible one from the list and assign a lower confidence score (e.g., less than 0.6).
If no category from the list seems appropriate, you MUST use a general category like "Other Expenses" as the 'category' and assign a very low confidence score (e.g., 0.1).
Do not respond with any conversational text around the tool usage—only use the tool.
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
    // 1. Fetch all category names for this business
    const categories = await getBusinessCategories(businessId);
    // 2. Create a tool that Obru-AI will call to return a JSON blob
    const classificationTool = createClassificationTool(categories);
    // 3. Build our “system prompt” that instructs the LLM how to behave
    const basePrompt = createClassifierBasePrompt(categories);

    // --- Adjusted: instantiate the Obru-AI agent with the documented fields ---
    const agent = new Agent({
      openaiKey: OPENAI_API_KEY!, // renamed from apiKey
      modelName: DEFAULT_MODEL, // renamed from model
      systemPrompt: basePrompt, // renamed from basePrompt
      tools: [classificationTool],
      temperature: DEFAULT_TEMPERATURE,
      // (You can uncomment logger/hooks if you need additional debugging in a dev environment)
      // logger: console,
      // hooks: {
      //   beforePrompt: (msgs) => console.debug("Sending messages to LLM:", JSON.stringify(msgs, null, 2)),
      //   afterResponse: (resp) => console.debug("LLM Raw Response:", JSON.stringify(resp, null, 2)),
      // },
    });

    // 4. Package up the user transaction into a single string
    const userInputString = `Description: ${description}\nAmount: ${amount}${
      merchantName ? `\nMerchant: ${merchantName}` : ""
    }`;

    // --- Adjusted: call agent.run(...) instead of processInput(...) ---
    // agent.run(...) will in turn invoke our classificationTool.execute(...) and return a JSON string.
    const rawResponseFromTool = await agent.run(userInputString);

    let suggestedCategoryName: string;
    let aiConfidence: number;

    try {
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
      // If the model picked a category outside our list, remap it to “Other Expenses” (or similar).
      if (!categories.includes(suggestedCategoryName)) {
        console.warn(
          `AI returned category "${suggestedCategoryName}" which is not in list. Falling back.`
        );
        const otherGeneralCategory =
          categories.find((c) => c.toLowerCase().includes("other")) ||
          categories.find((c) => c.toLowerCase().includes("miscellaneous"));
        suggestedCategoryName =
          otherGeneralCategory || categories[0] || "Uncategorized";
        aiConfidence = Math.min(aiConfidence, 0.2);
      }
    } catch (parseError) {
      console.error(
        "Failed to parse JSON response from AI tool:",
        parseError,
        "Raw response:",
        rawResponseFromTool
      );
      const otherGeneralCategory =
        categories.find((c) => c.toLowerCase().includes("other")) ||
        categories.find((c) => c.toLowerCase().includes("miscellaneous"));
      suggestedCategoryName = otherGeneralCategory || "Needs Review";
      aiConfidence = 0.05;
    }

    // 5. Look up the actual category ID in our database
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
          warning: `AI suggested category "${suggestedCategoryName}" but its ID could not be found. Skipping DB update.`,
          ai_tool_raw_response: rawResponseFromTool,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const categoryId = categoryData.id;

    // 6. Update the transaction row with the AI’s suggestion
    const { error: updateError } = await supabaseAdmin
      .from("TRANSACTIONS")
      .update({
        category_id: categoryId,
        ai_confidence: aiConfidence,
        status: "classified_by_ai_tool",
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
