# Marlin

Your books on autopilot.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Supabase CLI (for local development)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/marlin.git
cd marlin
```

### 2. Environment Variables

You need to set up environment variables for both the backend and frontend, as well as for Supabase. Example files are provided below:

#### Backend: `backend/.env.example`
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
NODE_ENV=development
PORT=3000
```

Copy this file to `.env.development` and fill in your actual credentials:
```bash
cp backend/.env.example backend/.env.development
```

#### Frontend: `frontend/.env.example`
```
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_KEY=your_supabase_anon_key
PUBLIC_API_URL=http://localhost:3000/
```

Copy this file to `.env` and fill in your actual credentials:
```bash
cp frontend/.env.example frontend/.env
```

#### Supabase: `supabase/.env.example`
```
SUPABASE_DB_PASSWORD=your_local_db_password
```

Copy this file to `.env` and fill in your actual credentials:
```bash
cp supabase/.env.example supabase/.env
```

### 3. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

### 4. Start Supabase Locally
```bash
cd ../supabase
supabase start
```

### 5. Run the Application

From the root directory, you can run all services in parallel:
```bash
npm run dev
```
This will start:
- Supabase (database & auth)
- Backend API (Express)
- Frontend (SvelteKit)

### 6. Access the App
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3000](http://localhost:3000)
- Supabase Studio: [http://localhost:54323](http://localhost:54323)

---

## Project Structure
- `backend/` — Express API, Plaid integration, Supabase admin
- `frontend/` — SvelteKit app
- `supabase/` — Database schema, migrations, local dev config

## Troubleshooting
- Ensure all `.env` files are set up and filled with valid credentials.
- If ports are in use, stop other services or change the port in the `.env` files.
- For Supabase CLI issues, see [Supabase CLI docs](https://supabase.com/docs/guides/cli).

---

## License
MIT
