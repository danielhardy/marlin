// supabase/functions/pull_plaid_tx/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2.49.3";

import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Transaction,
  RemovedTransaction,
} from "npm:plaid@^33.0.0";

import { Transaction as TransactionType } from "./types.ts";
console.log("Initializing Plaid transaction sync...");

// ── Configuration ──────────────────────────────────────────────────────────────
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const plaidClientId = Deno.env.get("PLAID_CLIENT_ID")!;
const plaidSecret = Deno.env.get("PLAID_SECRET")!;
const plaidEnv =
  (Deno.env.get("PLAID_ENV") as "sandbox" | "development" | "production") ||
  "sandbox";

if (!supabaseUrl || !supabaseServiceRoleKey || !plaidClientId || !plaidSecret) {
  console.error("Missing required environment variables:", {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
    PLAID_CLIENT_ID: plaidClientId,
    PLAID_SECRET: plaidSecret,
    PLAID_ENV: plaidEnv,
  });
  throw new Error(
    "Missing critical environment variables for Supabase or Plaid."
  );
}

// ── Initialize Supabase Admin Client ───────────────────────────────────────────
const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// ── Initialize Plaid Clients ───────────────────────────────────────────────────
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[plaidEnv],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": plaidClientId,
      "PLAID-SECRET": plaidSecret,
      "Plaid-Version": "2020-09-14",
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);
// const sandboxClient = new SandboxApi(plaidConfig);

// ── Types ──────────────────────────────────────────────────────────────────────
interface PlaidItem {
  id: string;
  access_token: string;
  cursor: string | null;
  business_id: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function fetchAllActiveItems(): Promise<PlaidItem[]> {
  console.log("Fetching all active Plaid items...");
  const { data, error } = await supabaseAdmin
    .from("plaid_items")
    .select("id, access_token, cursor, business_id")
    .eq("active", true);

  if (error) {
    console.error("Error fetching Plaid items:", error);
    throw error;
  }
  return data || [];
}

async function loadBankAccountMap(
  businessId: string
): Promise<Map<string, string>> {
  const { data, error } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, plaid_account_id")
    .eq("business_id", businessId);

  if (error) {
    console.error(
      `Error loading bank_accounts for business ${businessId}:`,
      error
    );
    throw error;
  }

  return new Map(data.map((acc) => [acc.plaid_account_id, acc.id]));
}

async function processSingleItem(item: PlaidItem): Promise<void> {
  console.log(
    `\nProcessing item_id=${item.id} (business_id=${item.business_id})`
  );

  // ── In sandbox, optionally fire a new batch of test transactions:
  if (plaidEnv === "sandbox") {
    console.log("  → Firing sandboxTransactionsFire…");
    // await sandboxClient.sandboxTransactionsFire({
    //   access_token: item.access_token,
    //   webhook_code: "DEFAULT_UPDATE",
    // });
    item.cursor = null; // force full backfill
  }

  // ── Reset cursor to force full backfill if needed:
  let currentCursor: string | undefined = item.cursor ?? undefined;
  // e.g. to re-backfill in prod: item.cursor = null; currentCursor = undefined;

  const accountMap = await loadBankAccountMap(item.business_id);

  let hasMore = true;
  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;

  while (hasMore) {
    const resp = await plaidClient.transactionsSync({
      access_token: item.access_token,
      cursor: currentCursor,
      count: 500,
    });

    const { data } = resp;

    console.log(
      `  → Plaid returned added=${data.added.length}, modified=${data.modified.length}, removed=${data.removed.length}`
    );

    // 1) Upsert new & modified
    const toUpsert = [...data.added, ...data.modified]
      .map((tx: Transaction) => {
        const bankAccountId = accountMap.get(tx.account_id);
        if (!bankAccountId) {
          console.warn(
            `    • skipping tx ${tx.transaction_id}: unknown account_id ${tx.account_id}`
          );
          return null;
        }
        return {
          business_id: item.business_id,
          item_id: item.id,
          bank_account_id: bankAccountId,
          plaid_transaction_id: tx.transaction_id,
          date_posted: tx.date,
          amount: tx.amount,
          iso_currency_code:
            tx.iso_currency_code ?? tx.unofficial_currency_code ?? "USD",
          name: tx.name,
          merchant_name: tx.merchant_name,
          raw_details: tx,
          pending: tx.pending,
          category_id: null, // set via ML/manual later
          // ai_confidence:       null,
          // status:              'pending',
          synced_at: new Date().toISOString(),
        };
      })
      .filter((r) => r !== null) as TransactionType[];

    if (toUpsert.length) {
      const { error: upsertErr } = await supabaseAdmin
        .from("transactions")
        .upsert(toUpsert, { onConflict: "plaid_transaction_id" });

      if (upsertErr) {
        console.error("    • upsert error:", upsertErr);
      } else {
        totalAdded += data.added.length;
        totalModified += data.modified.length;
      }
    }

    // 2) Delete removed
    if (data.removed.length) {
      const removedIds = data.removed.map(
        (rt: RemovedTransaction) => rt.transaction_id
      );
      const { error: delErr } = await supabaseAdmin
        .from("transactions")
        .delete()
        .in("plaid_transaction_id", removedIds);

      if (delErr) {
        console.error("    • delete error:", delErr);
      } else {
        totalRemoved += data.removed.length;
      }
    }

    currentCursor = data.next_cursor!;
    hasMore = data.has_more;
  }

  // 3) Persist new cursor
  const { error: cursorErr } = await supabaseAdmin
    .from("plaid_items")
    .update({ cursor: currentCursor, last_synced_at: new Date().toISOString() })
    .eq("id", item.id);

  if (cursorErr) {
    console.error("  • cursor update error:", cursorErr);
  } else {
    console.log(
      `  ✓ Finished item ${item.id}: added=${totalAdded}, modified=${totalModified}, removed=${totalRemoved}`
    );
  }
}

// ── Edge Function Handler ─────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  console.log("\n--- Pull Plaid TX Triggered ---");
  try {
    const items = await fetchAllActiveItems();

    if (items.length === 0) {
      console.log("No active Plaid items to sync.");
      return new Response(JSON.stringify({ message: "No active items." }), {
        status: 200,
      });
    }

    for (const item of items) {
      await processSingleItem(item);
    }

    console.log("All items processed.");
    return new Response(JSON.stringify({ message: "Sync complete." }), {
      status: 200,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: (err as Error).message,
      }),
      { status: 500 }
    );
  }
});
