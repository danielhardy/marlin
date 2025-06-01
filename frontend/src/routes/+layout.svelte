<!-- <script runes lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	$effect(() => {
		const { session, businessId } = $page.data;
		const currentPath = $page.url.pathname;
		if (session && !businessId) {
			const excludedPaths = [
				'/onboarding/business',
				'/auth/signin',
				'/auth/signup',
				'/auth/callback',
				'/auth/forgot',
				'/auth/reset'
			];
			const shouldRedirect = !excludedPaths.some(
				(path) => currentPath === path || currentPath.startsWith(path + '/')
			);
			if (shouldRedirect) {
				goto('/onboarding/business', { replaceState: true });
			}
		}
	});
</script>

<slot /> -->
<script lang="ts">
	import '../app.css';
	const { children } = $props();
</script>

{@render children()}
