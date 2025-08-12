# Marlin Frontend

This directory contains the frontend for the Marlin application. It is a [SvelteKit](https://kit.svelte.dev/) application.

## Overview

The frontend is responsible for:

-   Providing the user interface for the application.
-   Interacting with the backend API to fetch and display data.
-   Handling user input and authentication.
-   Providing a dashboard for managing financial data.

## Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   npm or yarn

### Installation

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env` file in the `frontend` directory by copying the example:

```bash
cp .env.example .env
```

Update the `.env` file with your Supabase URL and anon key.

### Running the Application

To run the frontend development server:

```bash
npm run dev
```

This will start the development server on [http://localhost:5173](http://localhost:5173).

### Building for Production

To build the application for production:

```bash
npm run build
```

This will create a production-ready build in the `.svelte-kit` directory.

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

-   `src/app.html`: The main HTML template for the application.
-   `src/app.css`: Global CSS styles.
-   `src/hooks.server.ts`: Server-side hooks for handling requests.
-   `src/lib`: Reusable libraries, components, and utilities.
    -   `src/lib/ui`: UI components like Navbar, Sidebar, etc.
    -   `src/lib/types`: TypeScript type definitions.
    -   `src/lib/utils.ts`: Utility functions.
-   `src/routes`: The file-based routing for the application. Each directory inside `src/routes` represents a page or a group of pages.
-   `static`: Static assets like images and fonts.