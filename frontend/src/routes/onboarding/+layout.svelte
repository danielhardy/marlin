<script lang="ts">
	import Logo from '$lib/ui/Logo.svelte';

	const { data, children } = $props();
	let completed = $state([]);
</script>

<main class="mx-auto flex max-w-md flex-col items-center justify-center">
	<div class="mb-16 w-16 dark:text-white">
		<Logo />
	</div>
	{@render children()}
</main>
