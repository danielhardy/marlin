import { supabaseAdmin } from "../config/supabaseConfig.js";

// Middleware to check if the user has a valid access token;
export async function plaid_access(req, res, next) {
  try {
    const token = req.headers.plaid_token_id || "";

    if (!token) {
      return res.status(401).json({ error: "Missing access token" });
    }

    // Look up the access_token in plaid_items
    const { data, error } = await supabaseAdmin
      .from("plaid_items")
      .select("access_token")
      .eq("id", token)
      .maybeSingle();

    if (error || !data) {
      return res.status(401).json({ error: "Invalid Plaid token" });
    }
    // Append the access token to the request object
    req.plaid_access_token = data.access_token;
    req.plaid_token_id = token;
    next();
  } catch (err) {
    console.error("Access error:", err.message);
    res.status(401).json({ error: "Unauthorized" });
  }
}
// ...existing code...
