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
	let plaid_item_ids = data.plaid_item_ids;
	let business_id = data.business_id;

	// Create initial types only used in this scope
	// TODO move to types folder
	type Account = {
		account_id: string;
		name: string;
		balances: {
			available: number;
			current: number;
			iso_currency_code: string;
			limit: number | null;
			unofficial_currency_code: string | null;
			// current?: number; // Uncomment if you use current balance
		};
		holder_category: string;
		mask: string;
		official_name: string;
		subtype: string;
		type: string;
		persistent_account_id?: string;
		// Add other properties as needed
	};
	type BankBalanceItem = {
		token_id: string;
		accounts: Account[];
	};
	// Declare variables and states
	let transactions: Transaction[] = $state([]);
	let accounts: Account[] = $state([]);
	// let accounts_count = $state(0);
	let hasBalances = $state(false);

	const fetchBankBalances = async () => {
		const response = await fetch(`${PUBLIC_API_URL}plaid/getAccountBalance`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session?.access_token}`
			},
			body: JSON.stringify({
				business_id: business_id,
				plaid_token_ids: (plaid_item_ids ?? []).map((item) => item.id)
			})
		});
		const parsedResponse = await response.json();
		// Flatten all accounts from all balances arrays into a single array
		accounts = (parsedResponse.balances ?? []).flatMap((item: BankBalanceItem) =>
			item.accounts.map((account: Account) => ({
				...account,
				token_id: item.token_id // Optionally keep track of which token_id this account belongs to
			}))
		);
		console.log('Parsed', accounts);
		return accounts.length;
	};

	const fetchTransactions = async () => {
		const { data, error } = await supabase
			.from('transactions')
			.select('*')
			.eq('business_id', business_id)
			.order('date_posted', { ascending: false });
		if (error) {
			console.error(error);
			return [];
		}
		transactions = data;
		return transactions.length;
	};

	onMount(async () => {
		// fetchData();
		let bankBalnces = await fetchBankBalances();
		hasBalances = true;
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
				<div class="card bg-base-300 mb-4 p-8 text-center">
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
