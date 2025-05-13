// src/services/plaidServiceHelpers.js
import { supabaseAdmin } from "../config/supabaseConfig.js"; // Use the existing admin client
import plaidClient from "./plaidService.js"; // Use the existing Plaid client

/**
 * Exchanges a Plaid public_token for an access_token and item_id.
 * @param {string} public_token - The public token obtained from Plaid Link.
 * @returns {Promise<{access_token: string, item_id: string, request_id: string}>}
 */
export async function exchangePublicToken(public_token) {
  console.log("Exchanging public token...");
  try {
    const { data } = await plaidClient.itemPublicTokenExchange({
      public_token,
    });
    console.log("Public token exchange successful.");
    return data; // { access_token, item_id, request_id }
  } catch (error) {
    console.error(
      "Error exchanging public token:",
      error.response ? error.response.data : error.message
    );
    throw error; // Rethrow to be caught by the route handler
  }
}

/**
 * Fetches core details about a Plaid Item.
 * @param {string} access_token - The access token for the Plaid Item.
 * @returns {Promise<object>} The Plaid Item object.
 */
export async function fetchPlaidItemDetails(access_token) {
  console.log("Fetching Plaid item details...");
  try {
    const { data } = await plaidClient.itemGet({ access_token });
    console.log("Plaid item details fetched successfully.");
    // data contains { item: {..., institution_id: ...}, status: ..., request_id: ... }
    return data.item; // Return the item object directly { item_id, institution_id, webhook, available_products, billed_products, consent_expiration_time, error, update_type }
  } catch (error) {
    console.error(
      "Error fetching Plaid item details:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}

/**
 * Upserts a Plaid Item into the database.
 * Now includes fields like user_id, active status, and initial cursor/sync times.
 * @param {object} itemData - Object containing item details.
 * @param {string} itemData.id - The Plaid Item ID (maps to your 'id' column if it's the PK).
 * @param {string} itemData.user_id - Your internal user ID.
 * @param {string} itemData.business_id - Your internal business ID.
 * @param {string} itemData.access_token - The Plaid access token.
 * @param {string | null} itemData.institution_id - The Plaid institution ID.
 * @param {string | null} itemData.institution_name - The Plaid institution name (optional, fetch separately if needed).
 * @param {boolean} itemData.active - Whether the item is active.
 * @param {string | null} itemData.cursor - The initial transaction cursor (should be null).
 * @param {string | null} itemData.last_synced_at - Initial sync time (null or set by sync function later).
 */
export async function upsertPlaidItem(itemData) {
  // Ensure itemData.id is the Plaid item_id and matches your DB column name for it
  const row = {
    id: itemData.id, // Assuming 'id' in your DB table IS the Plaid item_id
    user_id: itemData.user_id,
    business_id: itemData.business_id,
    access_token: itemData.access_token,
    institution_id: itemData.institution_id,
    institution_name: itemData.institution_name || null, // Make sure this is provided or handled
    active: itemData.active, // Typically true for a new item
    cursor: itemData.cursor, // Should be null initially
    last_synced_at: itemData.last_synced_at || null, // Will be set after first sync
    // products: itemData.products, // Uncomment if you store the products array
  };
  console.log(
    `Upserting Plaid item ${row.id} for business ${row.business_id}...`
  );
  try {
    // Use 'id' as the conflict target if it's your primary key / unique constraint for Plaid's item_id
    const { error } = await supabaseAdmin
      .from("plaid_items")
      .upsert(row, { onConflict: "id" }); // *** ADJUST 'id' TO YOUR ACTUAL PK/UNIQUE COLUMN NAME FOR PLAID ITEM ID ***
    if (error) throw error;
    console.log(`Plaid item ${row.id} upserted successfully.`);
  } catch (error) {
    console.error(`Error upserting Plaid item ${row.id}:`, error);
    throw error;
  }
}

/**
 * Fetches accounts associated with a Plaid Item.
 * @param {string} access_token - The access token for the Plaid Item.
 * @returns {Promise<Array<object>>} An array of Plaid account objects.
 */
export async function fetchPlaidAccounts(access_token) {
  console.log("Fetching Plaid accounts...");
  try {
    const { data } = await plaidClient.accountsGet({ access_token });
    console.log(`Workspaceed ${data.accounts.length} Plaid accounts.`);
    return data.accounts; // array of Plaid account objects
  } catch (error) {
    console.error(
      "Error fetching Plaid accounts:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}

/**
 * Upserts bank accounts into the database.
 * Now includes item_id to link accounts to their Plaid Item.
 * @param {Array<object>} accounts - Array of Plaid account objects.
 * @param {string} business_id - Your internal business ID.
 * @param {string} item_id - The Plaid Item ID these accounts belong to.
 */
export async function upsertBankAccounts(accounts, business_id, item_id) {
  const rows = accounts.map((a) => ({
    business_id,
    item_id, // *** ADDED: Link account to the Plaid Item ***
    plaid_account_id: a.account_id, // This is Plaid's unique ID for the account
    name: a.name,
    mask: a.mask,
    type: a.type,
    subtype: a.subtype,
    official_name: a.official_name || null,
    iso_currency_code: a.balances.iso_currency_code || "USD", // Use balances currency
    unofficial_currency_code: a.balances.unofficial_currency_code || null,
    current_balance: a.balances.current,
    available_balance: a.balances.available ?? null,
    credit_limit: a.balances.limit ?? null,
    // verification_status: a.verification_status // Uncomment if you store this
  }));

  if (rows.length === 0) {
    console.log("No bank accounts to upsert.");
    return;
  }

  console.log(
    `Upserting ${rows.length} bank accounts for item ${item_id} / business ${business_id}...`
  );
  try {
    // Ensure the onConflict constraint is appropriate.
    // If plaid_account_id is globally unique, this is fine.
    // If uniqueness is per item or per business, adjust the constraint and potentially the ON CONFLICT clause.
    const { error } = await supabaseAdmin
      .from("bank_accounts")
      .upsert(rows, { onConflict: "plaid_account_id" }); // *** ADJUST IF NEEDED based on your table's unique constraints ***
    if (error) throw error;
    console.log("Bank accounts upserted successfully.");
  } catch (error) {
    console.error("Error upserting bank accounts:", error);
    throw error;
  }
}

// ----- NEW FUNCTION -----
/**
 * Fetches transactions for a given Plaid Item using transactions/sync,
 * upserts them into the database, and updates the item's sync cursor.
 * Designed for the initial sync right after item creation.
 *
 * @param {string} accessToken - The Plaid access token for the item.
 * @param {string} itemId - The Plaid Item ID (should match the 'id' in your plaid_items table).
 * @param {string} businessId - Your internal business ID.
 * @returns {Promise<object>} Result of the sync operation.
 */
export async function syncAndUpsertTransactionsForItem(
  accessToken,
  itemId,
  businessId
) {
  console.log(
    `Starting initial transaction sync for item_id=${itemId}, business_id=${businessId}`
  );

  // 1. Load internal bank account map for the specific item and business
  // This maps Plaid's account_id to your internal bank_accounts primary key (e.g., 'id' or 'uuid')
  const accountInternalIdMap = new Map();
  let internalBankAccounts = [];
  try {
    const { data: accountsData, error: accError } = await supabaseAdmin
      .from("bank_accounts")
      .select("id, plaid_account_id") // 'id' is assumed to be your internal bank_account pk
      .eq("business_id", businessId)
      .eq("item_id", itemId);

    if (accError) {
      console.error(
        `Error loading bank_accounts for item ${itemId} (business ${businessId}):`,
        accError
      );
      throw accError;
    }
    internalBankAccounts = accountsData || [];
    if (internalBankAccounts.length === 0) {
      console.warn(
        `No bank accounts found locally for item_id ${itemId} and business_id ${businessId}. Cannot associate transactions.`
      );
      // Throw an error or return early if accounts are mandatory for transactions
      throw new Error(
        `Cannot sync transactions: No bank accounts found in DB for item ${itemId}. Ensure accounts are created first.`
      );
    }
    internalBankAccounts.forEach((acc) =>
      accountInternalIdMap.set(acc.plaid_account_id, acc.id)
    );
    console.log(
      `Loaded ${accountInternalIdMap.size} internal bank account mappings for item ${itemId}.`
    );
  } catch (error) {
    console.error(
      "Failed during bank account loading for transaction sync:",
      error
    );
    throw error;
  }

  let currentCursor = null; // Start with null for initial sync
  let hasMore = true;
  let totalAddedCount = 0;
  let totalModifiedCount = 0;
  let totalRemovedCount = 0;
  const MAX_ITERATIONS = 10; // Safety break for initial sync loop
  let iterations = 0;

  while (hasMore && iterations < MAX_ITERATIONS) {
    iterations++;
    try {
      console.log(
        `  Sync iteration ${iterations}, cursor: ${
          currentCursor ? "..." + currentCursor.slice(-6) : "null"
        }`
      );
      const request = {
        access_token: accessToken,
        cursor: currentCursor,
        count: 500, // Fetch up to 500 transactions per request
        options: {
          // include_personal_finance_category: true, // Optional: If you want Plaid's categorization
          // include_original_description: true, // Optional
        },
      };

      const response = await plaidClient.transactionsSync(request);
      const data = response.data; // { added: [], modified: [], removed: [], next_cursor: string, has_more: boolean }

      console.log(
        `  Plaid Sync returned: Added=${data.added.length}, Modified=${data.modified.length}, Removed=${data.removed.length}, HasMore=${data.has_more}`
      );

      // --- Process Added & Modified Transactions ---
      const transactionsToUpsert = [];
      const allChanges = [...data.added, ...data.modified];

      for (const tx of allChanges) {
        const internalBankAccountId = accountInternalIdMap.get(tx.account_id);
        if (!internalBankAccountId) {
          console.warn(
            `    Skipping tx ${tx.transaction_id} (item ${itemId}): Cannot find internal bank_account_id for Plaid account_id ${tx.account_id}.`
          );
          continue; // Skip if account mapping not found
        }
        transactionsToUpsert.push({
          business_id: businessId,
          item_id: itemId,
          bank_account_id: internalBankAccountId, // Your internal bank_account FK
          plaid_transaction_id: tx.transaction_id, // Assumed unique constraint target
          date_posted: tx.date, // Date transaction posted (YYYY-MM-DD)
          datetime_posted: tx.datetime || null, // More precise timestamp if available
          authorized_date: tx.authorized_date || null, // Date authorized (YYYY-MM-DD)
          authorized_datetime: tx.authorized_datetime || null, // More precise timestamp if available
          amount: tx.amount, // Negative for debits, positive for credits
          iso_currency_code: tx.iso_currency_code || "USD",
          unofficial_currency_code: tx.unofficial_currency_code || null,
          name: tx.name, // Transaction description from bank
          merchant_name: tx.merchant_name || tx.name, // Plaid's cleaned merchant name or fallback
          payment_channel: tx.payment_channel, // e.g., "online", "in store"
          pending: tx.pending,
          pending_transaction_id: tx.pending_transaction_id || null,
          // plaid_category_primary: tx.personal_finance_category?.primary || null, // If using include_personal_finance_category
          // plaid_category_detailed: tx.personal_finance_category?.detailed || null, // If using include_personal_finance_category
          plaid_category_icon_url:
            tx.personal_finance_category?.icon_url || null, // If using include_personal_finance_category
          plaid_category_id: tx.category_id || null, // Plaid's internal category ID
          location_address: tx.location?.address || null,
          location_city: tx.location?.city || null,
          location_region: tx.location?.region || null, // State/Province
          location_postal_code: tx.location?.postal_code || null,
          location_country: tx.location?.country || null,
          location_lat: tx.location?.lat || null,
          location_lon: tx.location?.lon || null,
          payment_meta_reference_number:
            tx.payment_meta?.reference_number || null,
          payment_meta_payer: tx.payment_meta?.payer || null,
          payment_meta_payee: tx.payment_meta?.payee || null,
          payment_meta_payment_method: tx.payment_meta?.payment_method || null,
          payment_meta_payment_processor:
            tx.payment_meta?.payment_processor || null,
          payment_meta_reason: tx.payment_meta?.reason || null,
          raw_details: tx, // Store the full Plaid transaction object for reference/debugging
          synced_at: new Date().toISOString(),
          // category_id: null, // Your internal category FK - set later
        });
      }

      if (transactionsToUpsert.length > 0) {
        console.log(
          `    Upserting ${transactionsToUpsert.length} transactions for item ${itemId}...`
        );
        const { error: upsertErr } = await supabaseAdmin
          .from("transactions")
          .upsert(transactionsToUpsert, { onConflict: "plaid_transaction_id" }); // Assumes plaid_transaction_id is unique

        if (upsertErr) {
          console.error(
            `    Error upserting transactions for item ${itemId}:`,
            upsertErr
          );
          throw upsertErr;
        }
        // Note: This doesn't perfectly distinguish added vs modified count from Plaid's perspective
        // but reflects the number of records successfully processed in this upsert batch.
        totalAddedCount += data.added.length; // Keep track based on Plaid's report
        totalModifiedCount += data.modified.length; // Keep track based on Plaid's report
      }

      // --- Process Removed Transactions ---
      if (data.removed.length > 0) {
        const removedPlaidTransactionIds = data.removed.map(
          (rt) => rt.transaction_id
        );
        console.log(
          `    Deleting ${removedPlaidTransactionIds.length} removed transactions for item ${itemId}...`
        );
        const { error: deleteErr } = await supabaseAdmin
          .from("transactions")
          .delete()
          .in("plaid_transaction_id", removedPlaidTransactionIds);

        if (deleteErr) {
          console.error(
            `    Error deleting transactions for item ${itemId}:`,
            deleteErr
          );
          // Decide if this is critical enough to stop the sync
          throw deleteErr;
        }
        totalRemovedCount += data.removed.length;
      }

      // Update cursor and loop control
      currentCursor = data.next_cursor;
      hasMore = data.has_more;
    } catch (error) {
      console.error(
        `  Error during transactionsSync loop (iteration ${iterations}) for item ${itemId}:`,
        error.response ? error.response.data : error.message
      );
      // Update cursor even on error? Plaid docs suggest the cursor might still be valid
      // if the error is potentially transient. For simplicity here, we stop and rethrow.
      // Persisting the last known *good* cursor might be better.
      console.log("  Aborting sync for item due to error.");
      throw error; // Rethrow to be handled by the route
    }
  } // end while loop

  if (iterations >= MAX_ITERATIONS && hasMore) {
    console.warn(
      `  Reached max iterations (${MAX_ITERATIONS}) for initial sync of item ${itemId}, but Plaid indicates more data (has_more=true). Cursor: ${currentCursor}. The background sync should pick this up.`
    );
    // Consider logging this more prominently or throwing a specific warning exception.
  }

  // 4. Persist the final cursor for the item
  try {
    console.log(
      `  Updating final cursor for item ${itemId}: ${
        currentCursor ? "..." + currentCursor.slice(-6) : "null"
      }`
    );
    const { error: cursorUpdateErr } = await supabaseAdmin
      .from("plaid_items")
      .update({
        cursor: currentCursor,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", itemId); // Use 'id' if it's the column name for Plaid item_id

    if (cursorUpdateErr) {
      console.error(
        `  Error updating final cursor for item ${itemId}:`,
        cursorUpdateErr
      );
      // Don't throw here? The transactions might be synced, just the cursor update failed.
      // The next background sync would just re-fetch the last batch. Maybe log severity.
      // For now, we'll still throw to indicate the process wasn't fully successful.
      throw cursorUpdateErr;
    }
  } catch (error) {
    console.error("Failed during final cursor update:", error);
    throw error;
  }

  console.log(
    `  ✓ Initial transaction sync finished for item ${itemId}: Added=${totalAddedCount}, Modified=${totalModifiedCount}, Removed=${totalRemovedCount}. Final cursor recorded.`
  );
  return {
    item_id: itemId,
    transactions_added_count: totalAddedCount,
    transactions_modified_count: totalModifiedCount,
    transactions_removed_count: totalRemovedCount,
    final_cursor: currentCursor,
  };
}
