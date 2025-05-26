// src/services/transactionServiceHelpers.js
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "../config/supabaseConfig.js";
import { Agent } from "obru-ai";

// Agent configuration
const DEFAULT_MODEL = process.env.OBRU_MODEL || "gpt-4o";
const DEFAULT_TEMPERATURE = parseFloat(process.env.OBRU_TEMPERATURE || "0.2");

/**
 * Retrieves the business ID associated with a given user.
 * @private
 * @param {string} userId - The internal user ID (UUID).
 * @returns {Promise<string>} The business ID if membership exists.
 * @throws {Error} If no membership is found or Supabase returns an error.
 */
export async function getBusinessIdForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from("memberships")
    .select("business_id")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Business membership not found");
  return data.business_id;
}

/**
 * Fetches available categories for a business.
 * @param {string} businessId - The internal business ID (UUID).
 * @returns {Promise<string[]>} Array of category names.
 * @throws {Error} If Supabase query fails.
 */
export async function getBusinessCategories(businessId) {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("name")
    .eq("business_id", businessId)
    .order("name");
  if (error) throw new Error(`Failed to fetch categories: ${error.message}`);
  if (!data || data.length === 0) {
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

  console.log(`Fetched ${data.length} categories for business ${businessId}`);
  return data.map((c) => c.name);
}

/**
 * Builds a classification tool for the Obru Agent.
 * @param {string[]} categories - List of business category names.
 * @returns {Tool} Tool definition for classification.
 */
function createClassificationTool(categories) {
  const enumList = categories.join(", ");
  return {
    name: "submitTransactionClassification",
    description: `Submit transaction classification. Category must be one of: ${enumList}.`,
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Chosen category name." },
        confidence: {
          type: "number",
          description: "Confidence score 0.0–1.0.",
        },
      },
      required: ["category", "confidence"],
    },
    execute: async ({ category, confidence }) => {
      if (!categories.includes(category)) {
        category =
          categories.find((c) => c.toLowerCase().includes("other")) ||
          categories[0];
        confidence = Math.min(confidence, 0.2);
      }
      return JSON.stringify({ category, confidence });
    },
  };
}

/**
 * Suggests classification categories for a transaction using Obru Agent.
 * @param {string} userId - The internal user ID (UUID).
 * @param {string} txId - The transaction ID (UUID) to classify.
 * @param {{description: string, merchant_name?: string, amount: number, date?: string}} txData - Transaction metadata.
 * @returns {Promise<Array<{category: string, confidence: number}>>} Top suggestions.
 * @throws {Error} On tool or agent failure.
 */
export async function suggestClassification(userId, txId, txData) {
  const businessId = await getBusinessIdForUser(userId);
  const categories = await getBusinessCategories(businessId);
  const tool = createClassificationTool(categories);
  const agent = new Agent({
    apiKey: process.env.OPENAI_API_KEY,
    model: DEFAULT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    tools: [tool],
    basePrompt: `You are a bookkeeping assistant. Classify the transaction. Available categories: ${categories.join(
      ", "
    )}. Respond in JSON format with "category" and "confidence" fields.`,
  });

  const input =
    `Merchant: ${txData.merchant_name} (${txData.name})` +
    `\nAmount: ${txData.amount} (${txData.iso_currency_code})${
      txData.date ? `\nDate: ${txData.date_posted}` : ""
    }` +
    `Plaid Category: ${txData.raw_details.personal_finance_category.primary}`;

  const raw = await agent.processInput(input);
  console.log(`Agent response for tx_id ${txId}: ${raw.trim()}`);

  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error(`Invalid tool response: ${raw}`);
  }

  return [{ category: parsed.category, confidence: parsed.confidence }];
}

/**
 * Confirms and persists a transaction classification.
 * @param {string} userId - The internal user ID (UUID).
 * @param {string} txId - The transaction ID (UUID) to update.
 * @param {string} categoryName - The chosen category name.
 * @returns {Promise<void>}
 * @throws {Error} If category not found or update fails.
 */
export async function confirmClassification(userId, txId, categoryName) {
  const businessId = await getBusinessIdForUser(userId);
  const { data: cat, error: findErr } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", categoryName)
    .single();
  if (findErr || !cat) throw new Error("Category not found");

  const { error: updErr } = await supabaseAdmin
    .from("transactions")
    .update({ category_id: cat.id })
    .eq("id", txId);
  if (updErr) throw updErr;
}

/**
 * Uploads a receipt file, optionally performs OCR, and links it to a transaction.
 * @param {string} userId - The internal user ID (UUID).
 * @param {object} file - Multer file object with path, originalname, mimetype.
 * @param {string|null} [txId] - Optional transaction ID (UUID) to link.
 * @returns {Promise<{receiptId: string, ocrData: object}>} Uploaded receipt info.
 * @throws {Error} If storage or insert fails.
 */
export async function uploadReceipt(userId, file, txId) {
  const businessId = await getBusinessIdForUser(userId);
  const timestamp = Date.now();
  const ext = path.extname(file.originalname);
  const storagePath = `${businessId}/receipts/${timestamp}${ext}`;

  const buffer = fs.readFileSync(file.path);
  const { error: uploadErr } = await supabaseAdmin.storage
    .from("receipts")
    .upload(storagePath, buffer, { contentType: file.mimetype });
  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabaseAdmin.storage
    .from("receipts")
    .getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  const ocrData = { date: null, amount: null, vendor: null };

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("receipts")
    .insert({
      business_id: businessId,
      user_id: userId,
      transaction_id: txId || null,
      file_url: fileUrl,
      ocr_data: ocrData,
    })
    .single();
  if (insErr) throw insErr;

  return { receiptId: inserted.id, ocrData };
}

/**
 * Lists receipts for a user filtered by match status.
 * @param {string} userId - The internal user ID (UUID).
 * @param {string} [status='all'] - 'matched' | 'unmatched' | 'all'.
 * @returns {Promise<Array>} Receipt records.
 * @throws {Error} If query fails.
 */
export async function listReceipts(userId, status = "all") {
  const businessId = await getBusinessIdForUser(userId);
  let query = supabaseAdmin
    .from("receipts")
    .select("*")
    .eq("business_id", businessId);

  if (status === "matched") query = query.not("transaction_id", "is", null);
  else if (status === "unmatched") query = query.is("transaction_id", null);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Suggests matching receipts for a given transaction.
 * @param {string} userId - The internal user ID (UUID).
 * @param {string} txId - The transaction ID (UUID) to match.
 * @returns {Promise<Array<{receipt_id: string, score: number}>>} Match candidates.
 * @throws {Error} If fetch fails.
 */
export async function suggestReceiptMatch(userId, txId) {
  const businessId = await getBusinessIdForUser(userId);
  const { data: tx, error: txErr } = await supabaseAdmin
    .from("transactions")
    .select("date_posted, amount")
    .eq("id", txId)
    .single();
  if (txErr || !tx) throw new Error("Transaction not found");

  const { data: receipts, error: rcErr } = await supabaseAdmin
    .from("receipts")
    .select("id, ocr_data")
    .eq("business_id", businessId)
    .is("transaction_id", null);
  if (rcErr) throw rcErr;

  const candidates = receipts
    .map((r) => {
      const diff =
        tx.amount && r.ocr_data.amount
          ? Math.abs(tx.amount - r.ocr_data.amount)
          : Infinity;
      const score = 1 / (1 + diff);
      return { receipt_id: r.id, score };
    })
    .sort((a, b) => b.score - a.score);

  return candidates.slice(0, 3);
}

/**
 * Confirms and links a receipt to a transaction.
 * @param {string} userId - The internal user ID (UUID).
 * @param {string} txId - The transaction ID (UUID).
 * @param {string} receiptId - The receipt ID (UUID).
 * @returns {Promise<void>}
 * @throws {Error} If update fails.
 */
export async function confirmReceiptMatch(userId, txId, receiptId) {
  const businessId = await getBusinessIdForUser(userId);
  const { error } = await supabaseAdmin
    .from("receipts")
    .update({ transaction_id: txId })
    .eq("id", receiptId)
    .eq("business_id", businessId);
  if (error) throw error;
}

/**
 * Retrieves a rolling cashflow report between two dates.
 * @param {string} userId - The internal user ID (UUID).
 * @param {string} start - Start date (YYYY-MM-DD).
 * @param {string} end - End date (YYYY-MM-DD).
 * @returns {Promise<Array<{date: string, net: number, balance: number}>>}
 * @throws {Error} If query fails.
 */
export async function getCashflowReport(userId, start, end) {
  const businessId = await getBusinessIdForUser(userId);
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("date_posted, amount")
    .eq("business_id", businessId)
    .gte("date_posted", start)
    .lte("date_posted", end)
    .order("date_posted", { ascending: true });
  if (error) throw error;

  const grouped = data.reduce((acc, tx) => {
    const d = tx.date_posted.split("T")[0];
    acc[d] = (acc[d] || 0) + tx.amount;
    return acc;
  }, {});

  let cum = 0;
  return Object.keys(grouped)
    .sort()
    .map((d) => {
      cum += grouped[d];
      return { date: d, net: grouped[d], balance: cum };
    });
}

/**
 * Forecasts future cashflow based on historical average.
 * @param {string} userId - The internal user ID (UUID).
 * @param {number} historyWindowDays - Past days count for average.
 * @param {number} forecastHorizonDays - Future days to forecast.
 * @returns {Promise<Array<{date: string, expected_net: number, lower: number, upper: number}>>}
 */
export async function forecastCashflow(
  userId,
  historyWindowDays,
  forecastHorizonDays
) {
  const today = new Date();
  const end = today.toISOString().split("T")[0];
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - historyWindowDays);
  const start = startDate.toISOString().split("T")[0];

  const history = await getCashflowReport(userId, start, end);
  if (!history.length) return [];
  const avg = history.reduce((sum, e) => sum + e.net, 0) / history.length;

  return Array.from({ length: forecastHorizonDays }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + 1);
    const date = d.toISOString().split("T")[0];
    return { date, expected_net: avg, lower: avg * 0.8, upper: avg * 1.2 };
  });
}
