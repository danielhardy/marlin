// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session, business_id } = await locals.safeGetSession();
	const supabase = locals.supabase;
	// if the user is not logged in redirect to /auth/signin
	if (!session) {
		redirect(303, '/auth/signin?r=plaid/oath');
	}

	// Check if the user has a business
	console.log('business_id', business_id);

	// Check if the user has a business
	const { data: bank_accounts, error } = await supabase
		.from('bank_accounts')
		.select('*')
		.eq('business_id', business_id);

	if (error) {
		console.error('Error fetching bank accounts:', error);
	}

	console.log('bank_accounts', bank_accounts);

	// Return the session (and optionally the business data if needed)
	return {
		session,
		user: session?.user ?? null,
		bank_accounts,
		business_id,
		cookies: []
	};
};
