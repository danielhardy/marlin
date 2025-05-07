<!-- src/routes/plaid/link/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';

	let linkToken: string;
	let handler: any;

	onMount(async () => {
		// 1) get a linkToken from Express
		const res = await fetch('http://localhost:3000/plaid/create_link_token', {
			credentials: 'include'
		});
		console.log('res', res);
		const body = await res.json();
		linkToken = body.link_token;

		handler = Plaid.create({
			token: linkToken,
			onSuccess: async (public_token) => {
				await fetch('/api/plaid/exchange_public_token', {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ public_token })
				});
			},
			onExit: (err, meta) => console.warn('Plaid exited', err, meta)
		});
		// 2) load Plaid JS & init
		// const s = document.createElement('script');
		// s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
		// s.onload = () => {
		// 	handler = Plaid.create({
		// 		token: linkToken,
		// 		onSuccess: async (public_token) => {
		// 			await fetch('/api/plaid/exchange_public_token', {
		// 				method: 'POST',
		// 				credentials: 'include',
		// 				headers: { 'Content-Type': 'application/json' },
		// 				body: JSON.stringify({ public_token })
		// 			});
		// 		},
		// 		onExit: (err, meta) => console.warn('Plaid exited', err, meta)
		// 	});
		// };
		// document.body.appendChild(s);
	});

	function openLink() {
		handler.open();
	}
</script>

<svelte:head>
	<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
</svelte:head>
<button onclick={openLink} class="btn btn-primary"> Connect your bank </button>
