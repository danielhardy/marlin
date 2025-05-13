<script lang="ts">
	import { onMount } from 'svelte';
	import type { Transaction } from '$lib/types/transactions';

	// ENV variables
	import { PUBLIC_API_URL } from '$env/static/public';

	//UI
	import Navbar from '$lib/ui/Navbar.svelte';

	// Get the props passed from server
	const { data } = $props();
	let session = $derived(data.session);
	let supabase = $derived(data.supabase);
	let access_tokens = data.access_tokens;

	// Create initial types only used in this scope
	// TODO move to types folder
	type Account = {
		account_id: string;
		name: string;
		balances: {
			available: number;
			// current?: number; // Uncomment if you use current balance
		};
		// Add other properties as needed
	};

	// Declare variables and states
	let transactions: Transaction[] = $state([]);
	let accounts: Account[] = $state([]);

	const fetchBankBalances = async () => {
		console.log('fetching data...');
		const response = await fetch(`${PUBLIC_API_URL}plaid/getAccountBalance`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session?.access_token}`,
				plaid_token_id: `${access_tokens && access_tokens[0] ? access_tokens[0].id : ''}`
			}
		});
		const parsedResponse = await response.json();
		accounts = parsedResponse.balanceData.accounts;
		console.log('Parsed', parsedResponse.balanceData.accounts);
		return accounts.length;
	};

	const fetchTransactions = async () => {
		const { data, error } = await supabase.from('transactions').select('*');
		if (error) {
			console.error(error);
			return [];
		}
		transactions = data;
		return transactions.length;
	};

	onMount(() => {
		console.log('data:', data);
		console.log('access_tokens:', access_tokens);

		// fetchData();
	});
</script>

<Navbar {session} supabase={data.supabase} />

<main class="p-16">
	<h1 class="mb-8 mt-4 text-4xl">Welcome back {session.user.user_metadata.display_name}!</h1>
	<!-- <button onclick={fetchBankBalances} class="btn btn-primary">Fetch Balanaces</button> -->

	{#await fetchBankBalances()}
		<p>Loading...</p>
	{:then accounts_count}
		<h1 class="mb-4 text-2xl font-medium">Accounts ({accounts_count})</h1>

		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each accounts as account}
				<div class="card bg-base-200 mb-4 p-8 text-center">
					<p class="mb-4 text-4xl">${account.balances.available}</p>
					<h2 class="text-xs uppercase">{account.name}</h2>
					<!-- <button onclick={() => fetchTransactions()} class="btn btn-outline">
					Fetch Transactions
				</button> -->
					<!-- <p>Current: {account.balances.current}</p> -->
				</div>
			{/each}
		</div>
	{/await}
	{#await fetchTransactions()}
		<p>Loading...</p>
	{:then transactions_count}
		<h1 class="text-2xl font-medium">Transactions</h1>
		<table class="table w-full text-sm">
			<thead>
				<tr>
					<th></th>
					<th>Date</th>
					<th>Merchant Name</th>
					<th>Category</th>
					<th>Amount</th>
					<!-- <th>Account ID</th> -->
					<!-- <th>Transaction ID</th> -->
				</tr>
			</thead>
			<tbody>
				{#each transactions as transaction}
					<tr class="hover:bg-base-200" data-id={transaction.id}>
						<td>
							{#if transaction.raw_details.logo_url}
								<img src={transaction.raw_details.logo_url} class="w-8" alt="icon" />
							{:else}
								<img
									src={transaction.raw_details.personal_finance_category_icon_url}
									class="w-8"
									alt="icon"
								/>
							{/if}
							<!-- <img src={transaction.logo_url} class="w-8" alt="icon" /> -->
						</td>
						<td>{transaction.date_posted}</td>
						<td>{transaction.name}</td>
						<td>
							<!-- <img src={transaction.personal_finance_category_icon_url} class="w-8" alt="icon" /> -->
							{transaction.raw_details.personal_finance_category?.primary ?? 'N/A'}
						</td>
						<td class="text-right font-mono">
							{#if transaction.amount < 0}
								<span class="text-green-500">+${Math.abs(transaction.amount).toFixed(2)}</span>
							{:else}
								<span class="">${transaction.amount.toFixed(2)}</span>
							{/if}
							<!-- ${transaction.amount}	 -->
						</td>
						<!-- <td>{transaction.account_id}</td>
					<td>{transaction.transaction_id}</td> -->
					</tr>
				{/each}
			</tbody>
		</table>
	{/await}
</main>
