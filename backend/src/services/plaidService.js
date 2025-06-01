// src/services/plaidService.js
import path from "path";
import dotenv from "dotenv";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

//Set environment variable;
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || "sandbox"; // Default to sandbox if not set

console.log(`Using Plaid environment: ${PLAID_ENV}`);

if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
  console.error(
    "PLAID_CLIENT_ID or PLAID_SECRET not set in .env file. Exiting."
  );
  process.exit(1); // Exit if critical Plaid credentials are missing
}

const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
      "PLAID-SECRET": PLAID_SECRET,
      "Plaid-Version": "2020-09-14", // Specify the Plaid API version
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

export default plaidClient;
