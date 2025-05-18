<script lang="ts">
	import { logoutUser } from '$lib/utils';
	import { goto } from '$app/navigation';
	import Logo from './Logo.svelte';

	const { session, supabase } = $props();

	if (!session) {
		throw new Error('Session is not available');
	}

	function logout() {
		logoutUser(supabase);
		goto('/auth/signin');
	}
</script>

<nav class="mt-8 flex flex-row items-center px-16">
	<div class="hover:bg-base-200 rounded">
		<a href="/" class="btn btn-ghost -ml-2 flex flex-row items-center">
			<div class="-ml-1 h-10 w-10">
				<Logo />
			</div>
			<span class="-ml-1 text-xl font-medium">marlin</span>
		</a>
	</div>
	<div class="flex-1"></div>
	<div class="">
		<ul class="menu menu-horizontal px-1">
			<!-- <li><a>Link</a></li> -->
			<li>
				<details>
					<summary class=""
						><span class="font-medium">{session.user.user_metadata?.display_name}</span></summary
					>
					<ul class="bg-base-100 rounded-t-none p-2">
						<li><a href="/settings">Settings</a></li>
						<li><button onclick={logout}>Logout </button></li>
					</ul>
				</details>
			</li>
		</ul>
	</div>
</nav>
