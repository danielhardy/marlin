<script lang="ts">
	import Navbar from '$lib/ui/Navbar.svelte';

	const { data } = $props();
	let session = $derived(data.session);
	let supabase = $derived(data.supabase);
	let bank_accounts = $derived(data.bank_accounts);
	console.log('bank_accounts', bank_accounts);
	let full_name = $state(session?.user?.user_metadata?.full_name || '');
	let password = $state('');
	let passwordConfirm = $state('');
	let nameMessage = $state('');
	let passwordMessage = $state('');

	const updateName = async (event: Event) => {
		event.preventDefault();
		const { error } = await supabase.auth.updateUser({ data: { full_name } });
		nameMessage = error ? 'Failed to update name.' : 'Name updated!';
	};

	const updatePassword = async (event: Event) => {
		event.preventDefault();
		if (password !== passwordConfirm) {
			passwordMessage = 'Passwords do not match.';
			return;
		}
		const { error } = await supabase.auth.updateUser({ password });
		passwordMessage = error ? 'Failed to update password.' : 'Password updated!';
		password = '';
		passwordConfirm = '';
	};
</script>

<Navbar {session} {supabase} />
<main class="mx-auto flex max-w-4xl flex-col gap-8 p-16">
	<h1 class="mb-8 text-4xl font-medium">Settings</h1>

	<!-- Update Name Form -->
	<form class="card bg-base-100 mb-4 p-6 shadow" onsubmit={updateName}>
		<h2 class="mb-4 text-xl font-semibold">Update Name</h2>
		<div class="form-control mb-4">
			<label class="label" for="full_name">
				<span class="label-text">Full Name</span>
			</label>
			<input
				id="full_name"
				type="text"
				class="input input-bordered w-full"
				bind:value={full_name}
				required
			/>
		</div>
		<button class="btn btn-primary" type="submit">Update Name</button>
		{#if nameMessage}
			<p class="mt-2 text-sm">{nameMessage}</p>
		{/if}
	</form>

	<!-- Update Password Form -->
	<form class="card bg-base-100 p-6 shadow" onsubmit={updatePassword}>
		<h2 class="mb-4 text-xl font-semibold">Update Password</h2>
		<div class="form-control mb-4">
			<label class="label" for="password">
				<span class="label-text">New Password</span>
			</label>
			<input
				id="password"
				type="password"
				class="input input-bordered w-full"
				bind:value={password}
				required
				minlength="6"
			/>
		</div>
		<div class="form-control mb-4">
			<label class="label" for="passwordConfirm">
				<span class="label-text">Confirm New Password</span>
			</label>
			<input
				id="passwordConfirm"
				type="password"
				class="input input-bordered w-full"
				bind:value={passwordConfirm}
				required
				minlength="6"
			/>
		</div>
		<button class="btn btn-primary" type="submit">Update Password</button>
		{#if passwordMessage}
			<p class="mt-2 text-sm">{passwordMessage}</p>
		{/if}
	</form>

	<!-- Bank Accounts Section -->
	<section class="card bg-base-100 mt-8 p-6 shadow">
		<h2 class="mb-4 text-xl font-semibold">Bank Accounts</h2>
		{#if bank_accounts && bank_accounts.length > 0}
			<ul class="divide-y">
				{#each bank_accounts as account}
					<li class="flex items-center justify-between py-3">
						<div>
							<div class="font-medium">{account.name}</div>
							<div class="text-xs text-gray-500">
								{account.mask ? `•••• ${account.mask}` : ''}
								{account.subtype}
							</div>
						</div>
						<div class="text-sm text-gray-700">
							${account.current_balance?.toFixed(2) ?? '0.00'}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mb-4 text-sm text-gray-500">No bank accounts connected.</p>
		{/if}
		<button class="btn btn-primary mt-4" onclick={() => alert('Plaid Link flow goes here!')}>
			Add Bank Account
		</button>
	</section>
</main>
