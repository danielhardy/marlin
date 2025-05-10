import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import dotenv from "dotenv";

dotenv.config({ path: `.env.${env}` });

// Configuration for the Plaid client
const environmentName = process.env.PLAID_ENV ?? "sandbox";

export const configuration = new Configuration({
  basePath: PlaidEnvironments[environmentName],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

//Instantiate the Plaid client with the configuration
export const PlaidClient = new PlaidApi(config);
