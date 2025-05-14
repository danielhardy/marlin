<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import { onMount } from 'svelte';

	const { data } = $props();
	let session = $derived(data.session);
	let business_id = $derived(data.business_id);

	let linkToken: string;
	let handler: any;

	onMount(async () => {
		// 1) get a linkToken from Express
		const res = await fetch(`${PUBLIC_API_URL}plaid/create_link_token`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${session?.access_token}`
			}
		});

		const body = await res.json();
		linkToken = body.link_token;

		// @ts-ignore
		handler = Plaid.create({
			token: linkToken,
			onSuccess: async (public_token: any) => {
				console.log('Plaid public_token', public_token);
				console.log('Sending...', JSON.stringify({ public_token, business_id }));
				await fetch(`${PUBLIC_API_URL}plaid/exchange_public_token`, {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session?.access_token}`
					},
					body: JSON.stringify({ public_token, business_id })
				});
				// Redirect to /home on success
				window.location.href = '/home';
			},
			onExit: (err: any, meta: any) => console.warn('Plaid exited', err, meta)
		});
	});

	function openLink() {
		handler.open();
	}
</script>

<svelte:head>
	<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
</svelte:head>

<div class="steps mb-8 w-full">
	<ul class="steps text-sm">
		<li class="step step-primary" data-content="✓">Account</li>
		<li class="step step-primary" data-content="✓">Business</li>
		<li class="step step-primary">Bank</li>
	</ul>
</div>
<div class="page-header w-full">
	<h1 class="text-2xl">Connect your bank</h1>
	<p class="my-8 text-sm">
		Plaid makes connecting to your bank easy and secure. Clicking the link will take you to plaid
		where you can select which accounts to grant access to.
	</p>
	<button onclick={openLink} class="btn btn-neutral mt-4 w-full">
		Connect your bank with Plaid
	</button>
</div>

<footer class="footer footer-center mt-16 p-4 text-xs text-neutral-500">
	<div>
		<p>Copyright © 2023 - All right reserved by Marlin</p>
		<p>business_id: {business_id}</p>
		<p>user_id: {session.user.id}</p>
	</div>
</footer>
