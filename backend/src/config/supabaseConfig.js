// src/index.js (or a separate auth.js)
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Pickup the environment variables from the .env file
const NODE_ENV = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${NODE_ENV}` });

// Create a Supabase client instance
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service_role key from your Supabase project
);
