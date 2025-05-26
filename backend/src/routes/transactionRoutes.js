import express from "express";
import {
  suggestClassification,
  confirmClassification,
  suggestReceiptMatch,
  confirmReceiptMatch,
  getBusinessIdForUser,
} from "../services/transactionServiceHelpers.js";
import { supabaseAdmin } from "../config/supabaseConfig.js";
const router = express.Router();

// Suggest classification for a transaction
router.post("/:tx_id/classify/suggest", async (req, res, next) => {
  const { tx_id } = req.params;
  const userId = req.user.id;
  const businessId = await getBusinessIdForUser(userId);
  if (!businessId) {
    return res.status(400).json({ error: "No business found for user" });
  }
  console.log(
    `Suggesting classification for tx_id: ${tx_id} for user: ${userId} in business: ${businessId}`
  );
  try {
    // 1. Fetch the transaction from Supabase
    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .select(
        "id, amount, merchant_name, raw_details, name, date_posted, iso_currency_code"
      )
      .eq("id", tx_id)
      .eq("business_id", businessId)
      .single();

    if (error) {
      console.error("Supabase error fetching transaction:", error);
      return next(error);
    }
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // 2. Call your classification suggester with the DB data
    const suggestions = await suggestClassification(userId, tx_id, transaction);

    // 3. Return the suggestions
    return res.json({ suggestions });
  } catch (err) {
    console.error(`Error suggesting classification for ${tx_id}:`, err);
    return next(err);
  }
});

// Confirm or override classification
router.put("/:tx_id/classify", async (req, res, next) => {
  const { tx_id } = req.params;
  const { category } = req.body;
  try {
    await confirmClassification(req.user.id, tx_id, category);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error confirming classification for ${tx_id}:`, err);
    next(err);
  }
});

// Suggest receipt matches for a transaction
router.post("/:tx_id/match/suggest", async (req, res, next) => {
  const { tx_id } = req.params;
  try {
    const matches = await suggestReceiptMatch(req.user.id, tx_id);
    res.json({ matches });
  } catch (err) {
    console.error(`Error suggesting matches for ${tx_id}:`, err);
    next(err);
  }
});

// Confirm receipt match
router.put("/:tx_id/match", async (req, res, next) => {
  const { tx_id } = req.params;
  const { receipt_id } = req.body;
  try {
    await confirmReceiptMatch(req.user.id, tx_id, receipt_id);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error confirming match for ${tx_id}:`, err);
    next(err);
  }
});

export default router;
