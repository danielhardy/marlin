<script lang="ts">
	import { preventDefault } from '$lib/utils';

	import { PUBLIC_BASE_DOMAIN } from '$env/static/public';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let supabase = $derived(data.supabase);

	let email = $state('');
	let message = $state('');

	const requestPasswordReset = async () => {
		message = '';
		const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: PUBLIC_BASE_DOMAIN + '/auth/reset' // Replace with your reset password page URL
		});
		if (error) {
			message = error.message;
		} else {
			message = 'Password reset link sent! Please check your email.';
			console.log('data from reset', data);
		}
	};
</script>

<h1 class="hdl hdl-1 mb-4">Forgot Password</h1>
{#if message}
	<div role="alert" class="alert alert-success mb-4">
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
<form onsubmit={() => preventDefault(requestPasswordReset)}>
	<div class="form-control mb-4">
		<label for="email" class="label"><span class="label-text">Email:</span></label>
		<input
			type="email"
			class="input input-bordered mb-4 w-full"
			id="email"
			bind:value={email}
			required
		/>
		<button class="btn btn-primary w-full" type="submit">Send Reset Link</button>
	</div>
</form>
