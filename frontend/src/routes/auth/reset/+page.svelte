<script lang="ts">
	import { preventDefault } from '$lib/utils';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let supabase = $derived(data.supabase);

	let message = $state('');
	let newPassword = $state('');

	onMount(() => {
		supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'PASSWORD_RECOVERY') {
				// User is authenticated via the recovery link
				// You can prompt the user to enter a new password
			}
		});
	});

	const updatePassword = async () => {
		message = '';
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		if (error) {
			message = error.message;
		} else {
			message = 'Password updated successfully!';
			goto('/login'); // Redirect to login page
		}
	};
</script>

<h1 class="hdl hdl-1">Reset Password</h1>
{#if message}
	<div role="alert" class="alert mb-4">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6 shrink-0 stroke-current"
			fill="none"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
		<span>{message}</span>
	</div>
{/if}
<form onsubmit={() => preventDefault(updatePassword)}>
	<div class="form-control mb-4">
		<label for="new-password" class="label"><span class="label-text">New Password:</span></label>
		<input
			type="password"
			class="input input-bordered"
			id="new-password"
			bind:value={newPassword}
			required
		/>
		<button class="btn btn-primary w-full" type="submit">Update Password</button>
	</div>
</form>
