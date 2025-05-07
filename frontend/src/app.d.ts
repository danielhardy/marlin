import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{
				session: Session | null;
				user: User | null;
			}>;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
		}
	}
}

export {};
