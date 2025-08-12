# Marlin Backend

This directory contains the backend server for the Marlin application. It is a Node.js application using Express.

## Overview

The backend is responsible for:

-   Handling API requests from the frontend.
-   Integrating with the Plaid API to connect to bank accounts and fetch transactions.
-   Interacting with the Supabase database for data storage.
-   User authentication and authorization.
-   Processing and classifying financial data using AI.

## Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   npm or yarn

### Installation

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env.development` file in the `backend` directory by copying the example:

```bash
cp .env.example .env.development
```

Update the `.env.development` file with your Supabase and Plaid credentials, and an OpenAI API key.

### Running the Application

To run the backend server in development mode (with hot-reloading):

```bash
npm run dev
```

To run the backend server in production mode:

```bash
npm run start
```

The server will start on the port specified in your `.env.development` file (default is 3000).

## Debugging

To debug the application, you can run the server with the `--inspect` flag:

```bash
npm run dev -- --inspect
```

This will start the Node.js inspector, which you can connect to with a debugger like the one built into VS Code or Chrome DevTools.

## Deployment

To deploy the backend, you can use a platform like Heroku, Render, or a cloud provider like AWS, GCP, or Azure.

A common approach is to containerize the application using Docker. A `Dockerfile` would be needed for this.

## API Endpoints

The API routes are defined in `src/routes`. All routes are prefixed with `/api`.

### Authentication (`/api/auth`)

-   **`POST /signup`**: Register a new user.
    -   **Body**: `{ "email": "user@example.com", "password": "password123" }`
-   **`POST /login`**: Log in a user.
    -   **Body**: `{ "email": "user@example.com", "password": "password123" }`
-   **`POST /refresh`**: Refresh an access token.
    -   **Body**: `{ "refresh_token": "..." }`
-   **`GET /me`**: Get the currently authenticated user's profile.
    -   **Headers**: `Authorization: Bearer <access_token>`
-   **`POST /logout`**: Log out the user.

### Plaid Integration (`/api/plaid`)

-   **`GET /create_link_token`**: Create a Plaid Link token for the frontend.
-   **`POST /exchange_public_token`**: Exchange a public token from Plaid Link for an access token.
    -   **Body**: `{ "public_token": "...", "business_id": "..." }`
-   **`POST /getAccountBalance`**: Get the balance for one or more Plaid items.
    -   **Body**: `{ "plaid_token_ids": ["..."], "business_id": "..." }`
-   **`GET /getTransactions`**: Get transactions for a Plaid item.

### Transaction Classification (`/api/classify`)

-   **`POST /:tx`**: Classify a single transaction using AI.
    -   **Params**: `tx` - The ID of the transaction to classify.
    -   **Body**: `{ "business_id": "...", "description": "...", "amount": 12.34, "merchant_name": "..." }`
-   **`GET /new`**: Classify all new, unclassified transactions.

### Transactions (`/api/transactions`)

-   **`POST /:tx_id/classify/suggest`**: Suggest a classification for a transaction.
    -   **Params**: `tx_id` - The ID of the transaction.
-   **`PUT /:tx_id/classify`**: Confirm or override a transaction's classification.
    -   **Params**: `tx_id` - The ID of the transaction.
    -   **Body**: `{ "category": "..." }`
-   **`POST /:tx_id/match/suggest`**: Suggest receipt matches for a transaction.
    -   **Params**: `tx_id` - The ID of the transaction.
-   **`PUT /:tx_id/match`**: Confirm a receipt match for a transaction.
    -   **Params**: `tx_id` - The ID of the transaction.
    -   **Body**: `{ "receipt_id": "..." }`

### Receipts (`/api/receipts`)

-   **`POST /`**: Upload a receipt.
    -   **Form Data**: `file` (the receipt file), `tx_id` (optional)
-   **`GET /`**: List receipts for the user.

### Reports (`/api/reports`)

-   **`GET /cashflow`**: Get a cash flow report.
    -   **Query Params**: `start`, `end`
-   **`POST /forecast/cashflow`**: Forecast cash flow.
    -   **Body**: `{ "history_window_days": 90, "forecast_horizon_days": 30 }`