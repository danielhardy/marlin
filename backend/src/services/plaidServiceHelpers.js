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
    return data.item; // Return the item object { item_id, institution_id, webhook, ... }
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
 * Matches the provided plaid_items schema.
 * @param {object} itemData - Object containing item details.
 * @param {string} itemData.id - The Plaid Item ID (TEXT, maps to your 'item_id' column).
 * @param {string} itemData.business_id - Your internal business ID (UUID).
 * @param {string} itemData.access_token - The Plaid access token.
 * @param {string | null} [itemData.institution_id] - The Plaid institution ID.
 * @param {string | null} [itemData.institution_name] - The Plaid institution name.
 * @param {string[]} [itemData.products] - Array of Plaid products.
 * @param {boolean} [itemData.active=true] - Whether the item is active.
 * @param {string | null} [itemData.cursor=null] - The initial transaction cursor.
 * @param {string | null} [itemData.last_synced_at=null] - Initial sync time.
 * @returns {Promise<object>} The upserted plaid_items record from the database (including its UUID PK 'id').
 */
export async function upsertPlaidItem(itemData) {
  const { data, error } = await supabaseAdmin.rpc("rpc_upsert_plaid_item", {
    _item_id: itemData.id,
    _business_id: itemData.business_id,
    _access_token: itemData.access_token,
    _cursor: itemData.cursor ?? null,
    _active: itemData.active ?? true,
    _institution_id: itemData.institution_id ?? null,
    _institution_name: itemData.institution_name ?? null,
    _products: itemData.products ?? [],
  });

  if (error) {
    console.error("Error upserting via RPC:", error);
    throw error;
  }

  return data[0]; // single row with decrypted access_token
}

/**
 * Fetches accounts associated with a Plaid Item using its access_token.
 * @param {string} access_token - The access token for the Plaid Item.
 * @returns {Promise<Array<object>>} An array of Plaid account objects.
 */
export async function fetchPlaidAccounts(access_token) {
  console.log("Fetching Plaid accounts from Plaid API...");
  try {
    const { data } = await plaidClient.accountsGet({ access_token });
    console.log(
      `Fetched ${data.accounts.length} Plaid accounts from Plaid API.`
    );
    return data.accounts; // array of Plaid account objects
  } catch (error) {
    console.error(
      "Error fetching Plaid accounts from Plaid API:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}

/**
 * Upserts bank accounts into the database.
 * Matches the provided bank_accounts schema (no item_id FK here).
 * @param {Array<object>} accountsFromPlaid - Array of Plaid account objects from Plaid API.
 * @param {string} business_id - Your internal business ID (UUID).
 * @returns {Promise<Array<object>>} Array of upserted bank account records from the database.
 */
export async function upsertBankAccounts(accountsFromPlaid, business_id) {
  const rows = accountsFromPlaid.map((a) => ({
    business_id: business_id, // UUID, FK to businesses.id
    plaid_account_id: a.account_id, // TEXT, Plaid's account_id, UNIQUE
    name: a.name, // TEXT
    mask: a.mask, // TEXT
    type: a.type, // TEXT
    subtype: a.subtype, // TEXT
    official_name: a.official_name || null, // TEXT
    currency_code: a.balances.iso_currency_code || "USD", // TEXT
    current_balance: a.balances.current, // NUMERIC
    available_balance: a.balances.available ?? 0.0, // NUMERIC
    credit_limit: a.balances.limit ?? 0.0, // NUMERIC
    // 'id' (UUID PK) and 'created_at' are auto-generated by the database.
  }));

  if (rows.length === 0) {
    console.log("No bank accounts to upsert.");
    return [];
  }

  console.log(
    `Upserting ${rows.length} bank accounts for business ${business_id}...`
  );
  try {
    // 'plaid_account_id' is the conflict target due to its UNIQUE constraint.
    const { data: upsertedBankAccounts, error } = await supabaseAdmin
      .from("bank_accounts")
      .upsert(rows, { onConflict: "plaid_account_id" })
      .select(); // Select all columns of the upserted rows

    if (error) throw error;
    console.log(
      `${upsertedBankAccounts.length} bank accounts upserted successfully.`
    );
    return upsertedBankAccounts;
  } catch (error) {
    console.error("Error upserting bank accounts:", error);
    throw error;
  }
}

/**
 * Fetches transactions for a given Plaid Item using transactions/sync,
 * upserts them into the database, and updates the item's sync cursor.
 *
 * @param {string} accessToken - The Plaid access token for the item.
 * @param {string} plaidItemStringId - The Plaid Item ID (TEXT, e.g., "item-xxx..."). This is Plaid's `item_id`.
 * @param {string} businessId - Your internal business ID (UUID).
 * @returns {Promise<object>} Result of the sync operation.
 */
export async function syncAndUpsertTransactionsForItem(
  accessToken,
  plaidItemStringId,
  businessId
) {
  console.log(
    `Starting transaction sync for Plaid Item (Plaid's textual ID: ${plaidItemStringId}), Business ID: ${businessId}`
  );

  // 0. Fetch the internal plaid_items record to get its UUID PK and current cursor
  let internalPlaidItemRecord;
  try {
    const { data: itemData, error: itemFetchError } = await supabaseAdmin
      .from("plaid_items")
      .select("id, cursor") // 'id' is the UUID PK, 'item_id' is Plaid's textual ID in this table
      .eq("item_id", plaidItemStringId) // Query by Plaid's textual item_id
      .eq("business_id", businessId) // Ensure it belongs to the correct business
      .single(); // Expect one item

    if (itemFetchError) {
      console.error(
        `Error fetching internal record for Plaid Item (Plaid's textual ID: ${plaidItemStringId}):`,
        itemFetchError
      );
      throw itemFetchError;
    }
    if (!itemData) {
      throw new Error(
        `Plaid Item (Plaid's textual ID: ${plaidItemStringId}) not found in database for business ${businessId}. Ensure item is created via upsertPlaidItem first.`
      );
    }
    internalPlaidItemRecord = itemData;
    console.log(
      `Internal record found for Plaid Item (Plaid's textual ID: ${plaidItemStringId}). DB UUID PK: ${internalPlaidItemRecord.id}`
    );
  } catch (error) {
    console.error("Failed during internal Plaid Item record fetching:", error);
    throw error;
  }

  const internalPlaidItemUUID = internalPlaidItemRecord.id; // This is the UUID PK of the plaid_item from your DB
  let currentCursor = internalPlaidItemRecord.cursor || null;

  // 1. Load internal bank account map for all accounts associated with this business.
  // This maps Plaid's textual account_id to your internal bank_accounts table's UUID PK ('id').
  const accountInternalIdMap = new Map();
  try {
    // Fetch all bank accounts for the given business_id.
    // 'id' here is bank_accounts.id (UUID PK).
    // 'plaid_account_id' is Plaid's textual account_id.
    const { data: accountsData, error: accError } = await supabaseAdmin
      .from("bank_accounts")
      .select("id, plaid_account_id")
      .eq("business_id", businessId);

    if (accError) {
      console.error(
        `Error loading bank_accounts for Business ID ${businessId}:`,
        accError
      );
      throw accError;
    }
    if (!accountsData || accountsData.length === 0) {
      // This might be a valid scenario if the business has an item but no accounts synced yet.
      // Transactions for this item won't be processable until its accounts are in bank_accounts table.
      console.warn(
        `No bank accounts found locally in DB for Business ID ${businessId}. Transactions cannot be mapped to internal bank account UUIDs unless accounts are first synced via upsertBankAccounts.`
      );
      // Depending on strictness, you might throw an error or allow sync to proceed (it will just skip all transactions).
    }
    accountsData.forEach((acc) => {
      accountInternalIdMap.set(acc.plaid_account_id, acc.id); // Map: Plaid's textual acc_id -> Your DB bank_account UUID PK
    });
    console.log(
      `Loaded ${accountInternalIdMap.size} internal bank account mappings for Business ID ${businessId}.`
    );
  } catch (error) {
    console.error(
      "Failed during bank account loading for transaction sync:",
      error
    );
    throw error;
  }

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
        `  Sync iteration ${iterations} for Plaid Item (Plaid's textual ID: ${plaidItemStringId}), cursor: ${
          currentCursor ? "..." + currentCursor.slice(-6) : "null"
        }`
      );
      const request = {
        access_token: accessToken,
        cursor: currentCursor,
        count: 500, // Fetch up to 500 transactions per request
        options: {
          // include_personal_finance_category: true, // Optional
          // include_original_description: true, // Optional
        },
      };

      const response = await plaidClient.transactionsSync(request);
      const data = response.data; // { added: [], modified: [], removed: [], next_cursor: string, has_more: boolean }

      console.log(
        `  Plaid Sync returned: Added=${data.added.length}, Modified=${data.modified.length}, Removed=${data.removed.length}, HasMore=${data.has_more}`
      );

      const transactionsToUpsert = [];
      const allChanges = [...data.added, ...data.modified];

      for (const tx of allChanges) {
        // tx.account_id is Plaid's textual account_id
        const internalBankAccountIdUUID = accountInternalIdMap.get(
          tx.account_id
        ); // Get our bank_accounts.id (UUID PK)

        if (!internalBankAccountIdUUID) {
          console.warn(
            `    Skipping tx ${tx.transaction_id} (Plaid Item ID: ${plaidItemStringId}): Cannot find internal bank_account_id (UUID PK) for Plaid account_id ${tx.account_id}. Ensure this account exists in your 'bank_accounts' table for business ${businessId}.`
          );
          continue; // Skip if account mapping not found
        }

        // Prepare transaction record for your 'transactions' table
        // This assumes your 'transactions' table has 'item_id' (UUID FK to plaid_items.id)
        // and 'bank_account_id' (UUID FK to bank_accounts.id).
        transactionsToUpsert.push({
          business_id: businessId, // UUID, FK to businesses.id (if your transactions table has this)
          item_id: internalPlaidItemUUID, // UUID, FK to plaid_items.id
          bank_account_id: internalBankAccountIdUUID, // UUID, FK to bank_accounts.id
          plaid_transaction_id: tx.transaction_id, // TEXT, Plaid's transaction_id, should be UNIQUE in your DB
          date_posted: tx.date, // DATE or TIMESTAMPTZ
          amount: tx.amount, // NUMERIC
          iso_currency_code:
            tx.iso_currency_code ?? tx.unofficial_currency_code ?? "USD", // TEXT
          name: tx.name, // TEXT
          merchant_name: tx.merchant_name, // TEXT
          raw_details: tx, // JSONB, store the full Plaid transaction object
          pending: tx.pending, // BOOLEAN
          // category_id: null, // Your internal category FK - set later
          synced_at: new Date().toISOString(), // TIMESTAMPTZ
        });
      }

      if (transactionsToUpsert.length > 0) {
        console.log(
          `    Upserting ${transactionsToUpsert.length} transactions for Plaid Item (DB UUID PK: ${internalPlaidItemUUID})...`
        );
        // Assumes 'plaid_transaction_id' is the UNIQUE constraint for conflict resolution in 'transactions' table.
        const { error: upsertErr } = await supabaseAdmin
          .from("transactions")
          .upsert(transactionsToUpsert, { onConflict: "plaid_transaction_id" });

        if (upsertErr) {
          console.error(
            `    Error upserting transactions for Plaid Item (DB UUID PK: ${internalPlaidItemUUID}):`,
            upsertErr
          );
          throw upsertErr; // This was the original error location for the user.
        }
        totalAddedCount += data.added.length;
        totalModifiedCount += data.modified.length;
      }

      // --- Process Removed Transactions ---
      if (data.removed.length > 0) {
        const removedPlaidTransactionIds = data.removed.map(
          (rt) => rt.transaction_id
        );
        console.log(
          `    Deleting ${removedPlaidTransactionIds.length} removed transactions for Plaid Item (DB UUID PK: ${internalPlaidItemUUID})...`
        );
        // Scope deletion by item_id (UUID PK) for safety, if your transactions table is large.
        // And by plaid_transaction_id.
        const { error: deleteErr } = await supabaseAdmin
          .from("transactions")
          .delete()
          .in("plaid_transaction_id", removedPlaidTransactionIds)
          .eq("item_id", internalPlaidItemUUID); // Ensures we only delete transactions for THIS item.

        if (deleteErr) {
          console.error(
            `    Error deleting transactions for Plaid Item (DB UUID PK: ${internalPlaidItemUUID}):`,
            deleteErr
          );
          throw deleteErr;
        }
        totalRemovedCount += data.removed.length;
      }

      currentCursor = data.next_cursor;
      hasMore = data.has_more;
    } catch (error) {
      console.error(
        `  Error during transactionsSync loop (iteration ${iterations}) for Plaid Item (Plaid ID: ${plaidItemStringId}, DB UUID PK: ${internalPlaidItemUUID}):`,
        error.response ? error.response.data : error.message
      );
      console.log("  Aborting sync for Plaid item due to error.");
      throw error; // Rethrow to be handled by the calling route/service
    }
  } // end while loop

  if (iterations >= MAX_ITERATIONS && hasMore) {
    console.warn(
      `  Reached max iterations (${MAX_ITERATIONS}) for sync of Plaid Item (Plaid ID: ${plaidItemStringId}), but Plaid indicates more data. Cursor: ${currentCursor}. The background sync should pick this up.`
    );
  }

  // 4. Persist the final cursor for the item in 'plaid_items' table
  try {
    console.log(
      `  Updating final cursor for Plaid Item (DB UUID PK: ${internalPlaidItemUUID}): ${
        currentCursor ? "..." + currentCursor.slice(-6) : "null"
      }`
    );
    const { error: cursorUpdateErr } = await supabaseAdmin
      .from("plaid_items")
      .update({
        cursor: currentCursor,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", internalPlaidItemUUID); // Use the DB UUID PK 'id' to target the update

    if (cursorUpdateErr) {
      console.error(
        `  Error updating final cursor for Plaid Item (DB UUID PK: ${internalPlaidItemUUID}):`,
        cursorUpdateErr
      );
      throw cursorUpdateErr;
    }
  } catch (error) {
    console.error("Failed during final cursor update:", error);
    throw error;
  }

  console.log(
    `  ✓ Transaction sync finished for Plaid Item (Plaid ID: ${plaidItemStringId}, DB UUID PK: ${internalPlaidItemUUID}): Added=${totalAddedCount}, Modified=${totalModifiedCount}, Removed=${totalRemovedCount}. Final cursor recorded.`
  );
  return {
    plaid_item_id: plaidItemStringId, // Plaid's textual ID
    item_uuid: internalPlaidItemUUID, // Your DB's UUID PK for the item in plaid_items
    transactions_added_count: totalAddedCount,
    transactions_modified_count: totalModifiedCount,
    transactions_removed_count: totalRemovedCount,
    final_cursor: currentCursor,
  };
}

/**
 * Retrieves the Plaid access_token for a given Plaid item ID and user ID.
 * @param {string} plaidItemId - The Plaid item ID (TEXT, e.g., 'item-xxx...').
 * @param {string} businessId - The internal user ID (UUID).
 * @returns {Promise<string|null>} The access_token if found and user has access, otherwise null.
 */
export async function getAccessTokenForPlaidItem(plaidItemId, businessId) {
  console.log(
    `Fetching access_token for Plaid item (Plaid ID: ${plaidItemId}) for business ${businessId}...`
  );
  try {
    // Query plaid_items table for the item with the given item_id and user_id (owner)
    const { data, error } = await supabaseAdmin
      .from("plaid_items")
      .select("access_token, business_id")
      .eq("id", plaidItemId)
      .single();

    if (error) {
      console.error("Error fetching access_token for Plaid item:", error);
      return null;
    }
    if (!data) return null;
    // Optionally, check that the user_id matches (ownership)
    // if (data.business_id !== businessId) {
    //   console.warn(
    //     `User ${businessId} does not have access to Plaid item ${businessId}`
    //   );
    //   return null;
    // }
    return data.access_token;
  } catch (err) {
    console.error("Exception in getAccessTokenForPlaidItem:", err);
    return null;
  }
}
