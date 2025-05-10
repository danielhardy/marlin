// src/routes/home/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session, business_id } = await locals.safeGetSession();
	const supabase = locals.supabase;

	// if the user is not logged in redirect to /auth/signin
	if (!session) {
		redirect(303, '/auth/signin?r=home');
	}

	// Return the session (and optionally the business data if needed)
	return {
		session,
		user: session?.user ?? null,
		business_id: business_id,
		cookies: []
	};
};
