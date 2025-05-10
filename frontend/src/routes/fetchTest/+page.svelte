<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_API_URL } from '$env/static/public';

	const { data } = $props();
	let session = $derived(data.session);
	let access_tokens = data.access_tokens;
	// let business_id = data.business_id;
	let transactions_count = 0;
	type Transaction = {
		date: string;
		merchant_name: string;
		amount: number;
		personal_finance_category: {
			primary: string;
		};
		personal_finance_category_icon_url: string;
		account_id: string;
		transaction_id: string;
		logo_url: string;
		// Add other properties as needed
	};
	let transactions: Transaction[] = $state([]);

	type Account = {
		account_id: string;
		name: string;
		balances: {
			available: number;
			// current?: number; // Uncomment if you use current balance
		};
		// Add other properties as needed
	};
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
		const response = await fetch(`${PUBLIC_API_URL}plaid/getTransactions`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session?.access_token}`,
				plaid_token_id: `${access_tokens && access_tokens[0] ? access_tokens[0].id : ''}`
			}
		});
		const parsedResponse = await response.json();
		transactions = parsedResponse.transactionsData.transactions;
		transactions_count = transactions.length;
		console.log('Parsed', parsedResponse);
	};

	onMount(() => {
		console.log('data:', data);
		console.log('access_tokens:', access_tokens);

		// fetchData();
	});
</script>

<main class="p-16">
	<h1 class="mb-8 mt-4 text-4xl">Fetch Test</h1>
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
					<tr>
						<td>
							{#if transaction.logo_url}
								<img src={transaction.logo_url} class="w-8" alt="icon" />
							{:else}
								<img src={transaction.personal_finance_category_icon_url} class="w-8" alt="icon" />
							{/if}
							<!-- <img src={transaction.logo_url} class="w-8" alt="icon" /> -->
						</td>
						<td>{transaction.date}</td>
						<td>{transaction.merchant_name}</td>
						<td>
							<!-- <img src={transaction.personal_finance_category_icon_url} class="w-8" alt="icon" /> -->
							{transaction.personal_finance_category.primary}
						</td>
						<td class="text-right font-mono">${transaction.amount}</td>
						<!-- <td>{transaction.account_id}</td>
					<td>{transaction.transaction_id}</td> -->
					</tr>
				{/each}
			</tbody>
		</table>
	{/await}
</main>
