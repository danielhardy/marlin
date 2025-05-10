// src/routes/plaidRoutes.js
import express from "express";
import { CountryCode, Products } from "plaid";
import plaidClient from "../services/plaidService.js";
import { supabaseAdmin } from "../config/supabaseConfig.js";
import { plaid_access } from "../middleware/plaid.js";

// Set the router
const router = express.Router();
// username: 'user_good'
// password: 'mfa_device'

// # Code for all devices: 1234
// code: 1234;
// Route: Creates a Link token
router.get("/create_link_token", async (req, res, next) => {
  console.log("Creating link token...");
  try {
    if (!req.user.id) {
      console.error("Session ID is not available.");
      return res.status(400).json({ error: "Session not initialized." });
    }
    const linkTokenConfig = {
      user: { client_user_id: req.user.id },
      client_name: "Plaid Quickstart App (JS)",
      language: "en",
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI || undefined,
    };
    const tokenResponse = await plaidClient.linkTokenCreate(linkTokenConfig);
    res.json(tokenResponse.data);
  } catch (error) {
    console.error("/create_link_token error:", error);
    next(error); // Pass to global error handler
  }
});

// Route: Exchanges the public token for an access token
router.post("/exchange_public_token", async (req, res, next) => {
  console.log("Exchanging public token...");
  if (!req.user.id) {
    console.error("User ID is not available.");
    return res.status(400).json({ error: "Session not initialized." });
  }
  try {
    const { public_token, business_id } = req.body;
    // console.log("public_token", public_token);
    // console.log(
    //   "business_id on express server at /echange_plugic_token",
    //   business_id
    // );

    const { data } = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    console.log("data", data);
    const { access_token, item_id, request_id } = data;

    // Persist for future calls
    await savePlaidItemForUser(business_id, access_token, item_id);

    // Optionally return the item_id so the front‑end can track it
    res.json({ success: true, item_id });
  } catch (err) {
    next(err);
  }
});

// Route: Fetches balance data (example authenticated route)
router.get("/getAccountBalance", plaid_access, async (req, res, next) => {
  // console.log("plaid_access", req.plaid_token_id);
  // console.log("access_token", req.plaid_access_token);
  try {
    // Check if the user is authenticated and has a valid access token
    const accessToken = req.user && req.plaid_access_token;
    if (!accessToken) {
      return res
        .status(401)
        .json({ error: "Not authorized. Access token missing." });
    }

    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    });
    res.json({
      balanceData: balanceResponse.data,
    });
  } catch (error) {
    console.error("/data error:", error);
    next(error);
  }
  next();
});

// Route: Fetches transactions data (example authenticated route)
router.get("/getTransactions", plaid_access, async (req, res, next) => {
  try {
    const accessToken = req.user && req.plaid_access_token;
    if (!accessToken) {
      return res
        .status(401)
        .json({ error: "Not authorized. Access token missing." });
    }

    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: "2025-01-01",
      end_date: "2025-10-01",
    });

    res.json({
      transactionsData: transactionsResponse.data,
    });
  } catch (error) {
    console.error("/data error:", error);
    next(error);
  }
});

// Route: Checks if the user's account is connected
router.get("/is_account_connected", (req, res) => {
  const isConnected = !!(req.session && req.session.access_token);
  res.json({ status: isConnected });
});

async function savePlaidItemForUser(business_id, access_token, item_id) {
  console.log(
    "Saving Plaid item for user:",
    business_id,
    access_token,
    item_id
  );
  // example using a Supabase table named `plaid_items`
  const { error } = await supabaseAdmin.from("plaid_items").insert({
    business_id: business_id,
    access_token: access_token,
    item_id: item_id,
  });
  if (error) {
    console.error("Error saving Plaid item:", error);
    throw error;
  }
}

export default router;
