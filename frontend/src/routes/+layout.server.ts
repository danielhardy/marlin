import type { LayoutServerLoad } from './$types';
// import { supabase } from '$lib/supabaseClient'; // Import supabase client

// Define a simple Profile type (adjust based on your actual profile structure)
// interface Profile {
// 	id: string;
// 	org_id: string;
// 	// Add other profile fields if needed
// }

export const load: LayoutServerLoad = async ({ locals: { safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	// let profile: Profile | null = null;

	// if (user) {
	// 	// Fetch the user's profile if logged in
	// 	const { data: profileData, error: profileError } = await supabase
	// 		.from('profiles')
	// 		.select('id, org_id') // Select necessary fields
	// 		.eq('id', user.id)
	// 		.single(); // Expecting only one profile per user

	// 	if (profileError) {
	// 		console.error('Error fetching user profile:', profileError);
	// 		// Handle error appropriately, maybe return an error state
	// 	} else {
	// 		profile = profileData as Profile;
	// 	}
	// }

	return {
		session,
		user
		// profile // Return the profile data
	};
};
