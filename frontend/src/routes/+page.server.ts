// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();

	// if the user is already logged in redirect to /home
	if (session) {
		redirect(303, '/home');
	}

	// if the user is not logged in redirect to /auth/signin
	redirect(303, '/auth/signin');
};
