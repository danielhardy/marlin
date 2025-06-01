// src/routes/classifyRoutes.js
import express from "express";
import dotenv from "dotenv";
import { supabaseAdmin } from "../config/supabaseConfig.js";
import { Agent } from "obru-ai";

// Get the environment variables
dotenv.config();
const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("FATAL: OPENAI_API_KEY is not set.");
}

const DEFAULT_MODEL = process.env.DEFAULT_MODEL ?? "gpt-4o";
const DEFAULT_TEMPERATURE = process.env.DEFAULT_MODEL ?? 0.2;

// ――― Helper: fetch business’s category names ―――
async function getBusinessCategories(businessId) {
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
      `No categories found for business ${businessId}. Falling back to defaults.`
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

  return data.map((c) => c.name);
}

// ――― Helper: create the Obru-AI classification tool ―――
async function createClassificationTool(categories) {
  const categoryEnumDescription = categories.join(", ");
  return {
    name: "submitTransactionClassification",
    description: `Submits the transaction classification. Must be one of: ${categoryEnumDescription}.`,
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: `The chosen category. Must be exactly one of: ${categoryEnumDescription}.`,
        },
        confidence: {
          type: "number",
          description: "Confidence score from 0.0 to 1.0.",
        },
      },
      required: ["category", "confidence"],
    },
    execute: async (args) => {
      if (!categories.includes(args.category)) {
        console.warn(
          `Tool received category "${args.category}" not in allowed list.`
        );
      }
      return JSON.stringify(args);
    },
  };
}

// ――― Helper: build the system prompt for Obru-AI ―――
async function createClassifierBasePrompt(categories) {
  const list = categories.join(", ");
  return `
You are an expert bookkeeping assistant AI. Your task is to categorize financial transactions.
Given a transaction description, merchant name (if available), and amount, you MUST classify the transaction.

To provide your classification, you MUST use the "submitTransactionClassification" tool.
The "category" parameter must be EXACTLY ONE from: ${list}.
The "confidence" parameter must be a number between 0.0 (low confidence) and 1.0 (high confidence).

Example input:
"Name: Starbucks Coffee
Amount: 25.99
Merchant: Starbucks"

You should choose a category and confidence, then call the tool.
If unsure, pick the most plausible with confidence < 0.6.
If none fits, pick a general category like "Other Expenses" and assign 0.1.
Do NOT return any conversational text—only invoke the tool.
`.trim();
}

// ――― Route: POST /classify/:tx ― classify a single transaction ―――
router.post("/:tx", express.json(), async (req, res) => {
  const transactionId = req.params.tx;
  const {
    business_id: businessId,
    description,
    amount,
    merchant_name: merchantName = null,
  } = req.body;

  if (
    !transactionId ||
    !businessId ||
    !description ||
    typeof amount !== "number"
  ) {
    return res.status(400).json({
      error:
        "Missing required fields: transaction_id (in URL), business_id, description, or amount.",
    });
  }

  try {
    // 1. Fetch category names for this business
    const categories = await getBusinessCategories(businessId);

    // 2a. Fetch recent classified transactions for baseline
    const { data: recentTxs, error: recentError } = await supabaseAdmin
      .from("transactions")
      .select("name, amount, merchant_name, ai_confidence, categories(name)")
      .eq("business_id", businessId)
      .not("category_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentError) {
      console.warn(
        `Error fetching recent classified transactions:`,
        recentError
      );
    }
    console.log(
      `Fetched ${
        recentTxs ? recentTxs.length : 0
      } recent transactions for baseline.`
    );

    let baselineContext = "";
    if (recentTxs && recentTxs.length > 0) {
      baselineContext =
        "Recent transactions for reference:\n" +
        recentTxs
          .map(
            (tx) =>
              `Name: ${tx.name}, Amount: ${tx.amount}, Merchant: ${
                tx.merchant_name || "N/A"
              }, Category: ${tx.categories[0].name}, Confidence: ${
                tx.ai_confidence
              }`
          )
          .join("\n");
    }

    // 2b. Create tool + prompt
    const classificationTool = await createClassificationTool(categories);
    const basePromptBody = await createClassifierBasePrompt(categories);
    const basePrompt = baselineContext
      ? `${basePromptBody}\n\n${baselineContext}`
      : basePromptBody;

    // 3. Instantiate Obru-AI agent
    const agent = new Agent({
      apiKey: OPENAI_API_KEY,
      model: DEFAULT_MODEL,
      basePrompt: basePrompt,
      tools: [classificationTool],
      // temperature: DEFAULT_TEMPERATURE,
    });

    // 4. Format user input
    const userInput = `Description: ${description}\nAmount: ${amount}${
      merchantName ? `\nMerchant: ${merchantName}` : ""
    }`;

    // 5. Run agent and get JSON string
    const rawToolResponse = await agent.processInput(userInput);

    // 6. Parse JSON response
    let suggestedCategory;
    let aiConfidence;
    try {
      const parsed = JSON.parse(rawToolResponse.trim());
      suggestedCategory = parsed.category;
      aiConfidence = parseFloat(parsed.confidence);
      if (
        !suggestedCategory ||
        typeof aiConfidence !== "number" ||
        aiConfidence < 0 ||
        aiConfidence > 1
      ) {
        throw new Error("Invalid tool response structure/values.");
      }
      // If category not in list, fallback
      if (!categories.includes(suggestedCategory)) {
        console.warn(
          `AI returned "${suggestedCategory}" not in list. Using fallback.`
        );
        const fallback =
          categories.find((c) => c.toLowerCase().includes("other")) ||
          categories[0];
        suggestedCategory = fallback;
        aiConfidence = Math.min(aiConfidence, 0.2);
      }
    } catch (parseErr) {
      console.error(
        "Failed to parse JSON from tool:",
        parseErr,
        "Raw:",
        rawToolResponse
      );
      const fallback =
        categories.find((c) => c.toLowerCase().includes("other")) ||
        "Needs Review";
      suggestedCategory = fallback;
      aiConfidence = 0.05;
    }

    // 7. Look up category ID in DB; if missing, insert as system category
    let categoryId;
    let { data: categoryData, error: categoryError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("business_id", businessId)
      .eq("name", suggestedCategory)
      .single();

    if (categoryError || !categoryData) {
      console.warn(
        `Category "${suggestedCategory}" not found for business ${businessId}. Inserting as system category.`
      );
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from("categories")
        .insert({
          business_id: businessId,
          name: suggestedCategory,
          is_system: true,
          parent_id: null,
          schedule_c_code: null,
        })
        .select("id")
        .single();

      if (insertError || !insertData) {
        console.error(
          `Failed to insert fallback category "${suggestedCategory}":`,
          insertError
        );
        return res.status(500).json({
          error: `Could not create fallback category "${suggestedCategory}".`,
        });
      }
      categoryId = insertData.id;
    } else {
      categoryId = categoryData.id;
    }

    // 8. Update transaction row
    const { error: updateError } = await supabaseAdmin
      .from("transactions")
      .update({
        category_id: categoryId,
        ai_confidence: aiConfidence,
        status: "classified_by_ai_tool",
      })
      .eq("id", transactionId)
      .eq("business_id", businessId);

    if (updateError) {
      console.error(
        `Failed to update transaction ${transactionId}:`,
        updateError
      );
      throw new Error(`DB update failed: ${updateError.message}`);
    }

    return res.status(200).json({
      transaction_id: transactionId,
      classified_category: suggestedCategory,
      category_id: categoryId,
      ai_confidence: aiConfidence,
      message: "Transaction classified and updated successfully.",
    });
  } catch (err) {
    console.error(`Error classifying transaction ${transactionId}:`, err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
});

// ――― Route: GET /classify/new ― classify all unclassified transactions ―――
router.get("/new", async (_req, res) => {
  try {
    // 1. Fetch unclassified transactions (category_id IS NULL)
    const { data: pendingTxs, error: fetchError } = await supabaseAdmin
      .from("transactions")
      .select("id, business_id, name, amount, merchant_name")
      .is("category_id", null)
      .limit(2); // batch size

    if (fetchError) {
      console.error("Error fetching unclassified transactions:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!pendingTxs || pendingTxs.length === 0) {
      return res
        .status(200)
        .json({ message: "No new transactions to classify." });
    }

    const results = [];

    // 2. Loop through each transaction
    for (const tx of pendingTxs) {
      try {
        const { id: txId, business_id, name, amount, merchant_name } = tx;

        // 2a. Get category list
        const categories = await getBusinessCategories(business_id);

        // 2a. Fetch recent classified transactions for baseline
        const { data: recentTxs, error: recentError } = await supabaseAdmin
          .from("transactions")
          .select(
            "name, amount, merchant_name, ai_confidence, categories(name)"
          )
          .eq("business_id", business_id)
          .not("category_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentError) {
          console.warn(
            `Error fetching recent classified transactions:`,
            recentError
          );
        }

        let baselineContext = "";
        if (recentTxs && recentTxs.length > 0) {
          baselineContext =
            "Recent transactions for reference:\n" +
            recentTxs
              .map(
                (tx) =>
                  `Name: ${tx.name}, Amount: ${tx.amount}, Merchant: ${
                    tx.merchant_name || "N/A"
                  }, Category: ${tx.categories[0].name}, Confidence: ${
                    tx.ai_confidence
                  }`
              )
              .join("\n");
        }

        // 2b. Create tool + prompt
        const classificationTool = await createClassificationTool(categories);
        const basePromptBody = await createClassifierBasePrompt(categories);
        const basePrompt = baselineContext
          ? `${basePromptBody}\n\n${baselineContext}`
          : basePromptBody;

        // 2c. Instantiate agent
        const agent = new Agent({
          apiKey: OPENAI_API_KEY,
          model: DEFAULT_MODEL,
          basePrompt: basePrompt,
          tools: [classificationTool],
          // temperature: DEFAULT_TEMPERATURE,
        });

        // 2d. Format input
        const userInput = `Name: ${name}\nAmount: ${amount}${
          merchant_name ? `\nMerchant: ${merchant_name}` : ""
        }`;

        // 2e. Run agent
        const rawToolResp = await agent.processInput(userInput);

        // 2f. Parse JSON
        let suggestedCategory;
        let aiConfidence;
        try {
          const parsed = JSON.parse(rawToolResp.trim());
          suggestedCategory = parsed.category;
          aiConfidence = parseFloat(parsed.confidence);

          if (
            !suggestedCategory ||
            typeof aiConfidence !== "number" ||
            aiConfidence < 0 ||
            aiConfidence > 1
          ) {
            throw new Error("Invalid tool response.");
          }
          if (!categories.includes(suggestedCategory)) {
            console.warn(
              `AI returned "${suggestedCategory}" not in list. Using fallback.`
            );
            const fallback =
              categories.find((c) => c.toLowerCase().includes("other")) ||
              categories[0];
            suggestedCategory = fallback;
            aiConfidence = Math.min(aiConfidence, 0.2);
          }
        } catch (parseErr) {
          console.error(
            "Failed to parse JSON from tool:",
            parseErr,
            "Raw:",
            rawToolResp
          );
          const fallback =
            categories.find((c) => c.toLowerCase().includes("other")) ||
            "Needs Review";
          suggestedCategory = fallback;
          aiConfidence = 0.05;
        }

        // 2g. Look up category ID; insert if missing
        let categoryId;
        let { data: categoryData, error: categoryError } = await supabaseAdmin
          .from("categories")
          .select("id")
          .eq("business_id", business_id)
          .eq("name", suggestedCategory)
          .single();

        if (categoryError || !categoryData) {
          console.warn(
            `Category "${suggestedCategory}" not found for business ${business_id}. Inserting as system category.`
          );
          const { data: insertData, error: insertError } = await supabaseAdmin
            .from("categories")
            .insert({
              business_id: business_id,
              name: suggestedCategory,
              is_system: true,
              parent_id: null,
              schedule_c_code: null,
            })
            .select("id")
            .single();

          if (insertError || !insertData) {
            console.error(
              `Failed to insert fallback category "${suggestedCategory}":`,
              insertError
            );
            results.push({
              transaction_id: txId,
              classified_category: suggestedCategory,
              ai_confidence: aiConfidence,
              status: "skipped",
              error_message: `Could not create fallback category "${suggestedCategory}".`,
            });
            continue;
          }
          categoryId = insertData.id;
        } else {
          categoryId = categoryData.id;
        }

        // 2h. Update transaction record
        const { error: updateError } = await supabaseAdmin
          .from("transactions")
          .update({
            category_id: categoryId,
            ai_confidence: aiConfidence,
            // status: "classified_by_ai_tool",
          })
          .eq("id", txId)
          .eq("business_id", business_id);

        if (updateError) {
          console.error(`Failed to update transaction ${txId}:`, updateError);
          results.push({
            transaction_id: txId,
            classified_category: suggestedCategory,
            ai_confidence: aiConfidence,
            status: "error",
            error_message: `DB update failed: ${updateError.message}`,
          });
          continue;
        }

        results.push({
          transaction_id: txId,
          classified_category: suggestedCategory,
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

    // 3. Return batch summary
    return res.status(200).json({
      message: "Batch classification complete.",
      processed_count: pendingTxs.length,
      details: results,
    });
  } catch (err) {
    console.error("Fatal error in /classify/new:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
});

export default router;
