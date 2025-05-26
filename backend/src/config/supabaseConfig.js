// src/index.js (or a separate auth.js)
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

// Pickup the environment variables from the .env file
// Get the environment variables
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});
console.log("ENV loading from:", path.resolve(process.cwd(), ".env"));

// Create a Supabase client instance
export const supabaseAdmin = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service_role key from your Supabase project settingss
);

// export const supabase = createClient(
//   process.env.PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_ANON_KEY // anon key for client-side access
// );
