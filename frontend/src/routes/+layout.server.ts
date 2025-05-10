import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
// import { supabase } from '$lib/supabaseClient'; // Import supabase client

// Define a simple Profile type (adjust based on your actual profile structure)
// interface Profile {
// 	id: string;
// 	org_id: string;
// 	// Add other profile fields if needed
// }

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, url, cookies }) => {
	const { session, user, business_id } = await safeGetSession();

	if (session && !business_id) {
		const path = url.pathname;
		const excludedPaths = [
			'/onboarding/business',
			'/auth/signin',
			'/auth/signup',
			'/auth/callback',
			'/auth/forgot',
			'/auth/reset'
		];
		const isExcluded = excludedPaths.some((p) => path === p || path.startsWith(p + '/'));
		if (!isExcluded) {
			throw redirect(303, '/onboarding/business');
		}
	}

	return {
		session,
		user,
		business_id,
		cookies: cookies.getAll()
	};
};
