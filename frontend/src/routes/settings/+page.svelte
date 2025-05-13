<script lang="ts">
	import Navbar from '$lib/ui/Navbar.svelte';

	const { data } = $props();
	let session = $derived(data.session);
	let supabase = $derived(data.supabase);
</script>

<Navbar {session} {supabase} />
<main class="flex flex-col p-16">
	<h1 class="text-4xl font-medium">Settings</h1>
</main>
