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

	// Fetch the access_token from plaid_items for the user's business
	let access_tokens = null;
	if (business_id) {
		const { data: fetched_access_tokens, error } = await supabase
			.from('plaid_items')
			.select('id')
			.eq('business_id', business_id);

		if (error) {
			console.error('Error fetching access_token:', error);
		}
		if (!error && fetched_access_tokens) {
			access_tokens = fetched_access_tokens;
		}
		console.log('access_tokens', access_tokens);
	}

	// Return the session (and optionally the business data if needed)
	return {
		session,
		user: session?.user ?? null,
		business_id: business_id,
		cookies: [],
		access_tokens
	};
};
