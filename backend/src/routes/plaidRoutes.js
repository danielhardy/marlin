// src/routes/plaidRoutes.js
import express from "express";
import { CountryCode, Products } from "plaid";
import { plaid_access } from "../middleware/plaid.js";
import plaidClient from "../services/plaidService.js";
import {
  exchangePublicToken,
  fetchPlaidItemDetails,
  upsertPlaidItem,
  fetchPlaidAccounts,
  upsertBankAccounts,
  syncAndUpsertTransactionsForItem,
} from "../services/plaidServiceHelpers.js";

const router = express.Router();

// Create a link token for the Plaid Link flow
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

router.post("/exchange_public_token", async (req, res, next) => {
  const { public_token, business_id } = req.body;

  if (!public_token || !business_id) {
    return res
      .status(400)
      .json({ error: "public_token and business_id are required." });
  }
  if (!req.user || !req.user.id) {
    // Assuming req.user.id is available for associating the item
    console.error("User ID is not available in request.");
    return res.status(400).json({ error: "User context not found." });
  }

  try {
    // 1) Exchange public token for access token and item_id
    const { access_token, item_id } = await exchangePublicToken(public_token);
    console.log(
      `Public token exchanged. Access Token: [REDACTED], Item ID: ${item_id}`
    );

    // 2) Fetch Plaid item details (e.g., institution_id)
    const plaidItemDetails = await fetchPlaidItemDetails(access_token);
    const institution_id = plaidItemDetails?.item?.institution_id;
    // const institution_name = plaidItemDetails?.institution?.name; // If available & needed

    console.log(`Workspaceed Plaid item details for Item ID: ${item_id}`);

    // 3) Upsert Plaid Item to your database
    // The item_id from Plaid is the primary key for your plaid_items table.
    // The cursor will be set to null initially and updated by syncAndUpsertTransactionsForItem.
    const itemToUpsert = {
      id: item_id, // This is the Plaid Item ID
      user_id: req.user.id, // Associate with your internal user
      business_id: business_id,
      access_token: access_token,
      institution_id: institution_id,
      // institution_name: institution_name,
      active: true,
      cursor: null, // Initial cursor is null
      // last_synced_at will be updated by the transaction sync
    };
    await upsertPlaidItem(itemToUpsert); // Ensure upsertPlaidItem can handle these fields
    console.log(`Plaid item upserted/updated in DB for Item ID: ${item_id}`);

    // 4) Fetch accounts associated with the item from Plaid
    const accountsFromPlaid = await fetchPlaidAccounts(access_token);
    console.log(
      `Workspaceed ${accountsFromPlaid.length} accounts from Plaid for Item ID: ${item_id}`
    );

    // 5) Upsert bank accounts to your database, linking them to the item_id and business_id
    // Ensure upsertBankAccounts populates item_id in your bank_accounts table.
    await upsertBankAccounts(accountsFromPlaid, business_id, item_id);
    console.log(`Bank accounts upserted in DB for Item ID: ${item_id}`);

    // 6) Perform initial transaction sync for the new item
    console.log(
      `Starting initial transaction sync for new Item ID: ${item_id}`
    );
    const syncResult = await syncAndUpsertTransactionsForItem(
      access_token,
      item_id,
      business_id
    );
    console.log(
      `Initial transaction sync completed for Item ID: ${item_id}. Results:`,
      syncResult
    );

    res.json({
      success: true,
      item_id: item_id,
      message:
        "Plaid item linked, accounts and initial transactions synced successfully.",
      transaction_sync_details: syncResult,
    });
  } catch (err) {
    console.error(
      "Error in /exchange_public_token route:",
      err.response ? err.response.data : err.message,
      err.stack
    );
    // Consider if any cleanup is needed if partial steps succeeded
    next(err); // Pass to global error handler
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

export default router;
