<script lang="ts">
	import { goto } from '$app/navigation';
	import { logoutUser } from '$lib/utils.js';

	const { data } = $props();
	let user = $derived(data.session?.user);
	let business_id = $derived(data.business_id);
	function logout() {
		logoutUser(data.supabase);
		goto('/auth/signin');
	}
</script>

<h1>Howdy {user?.id}</h1>
<p>Business: {business_id}</p>
<button onclick={logout} class="btn btn-link">Logout</button>
