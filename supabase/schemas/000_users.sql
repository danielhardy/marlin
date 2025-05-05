-- 00_users.sql
-- NOTE: In Supabase, you typically use the built-in auth.users table.
-- You might create a 'profiles' table linked via a foreign key (user_id uuid references auth.users(id))
-- to store additional app-specific user data.
-- This schema assumes a standalone setup or mirroring approach.

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- Or reference auth.users.id
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for potential lookups by email
CREATE INDEX idx_users_email ON users(email);

-- Supabase RLS Policy Example (Conceptual - adapt as needed)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);