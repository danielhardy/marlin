// src/middleware/auth.js
import { supabaseAdmin } from "../config/supabaseConfig.js";
// wherever you exported it

export async function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.replace(/^Bearer\s+/, "");

    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    // Verify & decode the JWT
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw error ?? new Error("Invalid token");
    }

    // now you’ve got a full User object
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(401).json({ error: "Unauthorized" });
  }
}
