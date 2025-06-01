<script lang="ts">
	import { onMount } from 'svelte';
	import type { Transaction } from '$lib/types/transactions';

	// ENV variables
	import { PUBLIC_API_URL } from '$env/static/public';

	//UI
	import Navbar from '$lib/ui/Navbar.svelte';
	import Sidebar from '$lib/ui/Sidebar.svelte';

	// Get the props passed from server
	const { data } = $props();
	let session = $derived(data.session);
	let supabase = $derived(data.supabase);
	// let plaid_item_ids = data.plaid_item_ids;
	let business_id = data.business_id;

	// Create initial types only used in this scope
	// TODO move to types folder
	type Account = {
		available_balance: number;
		business_id: string;
		created_at: string; // ISO 8601 timestamp
		credit_limit: number;
		currency_code: string;
		current_balance: number;
		id: string;
		mask: string;
		name: string;
		official_name: string;
		plaid_account_id: string;
		subtype: string;
		type: string;
	};
	type BankBalanceItem = {
		token_id: string;
		accounts: Account[];
	};
	// Declare variables and states
	let transactions: Transaction[] = $state([]);
	let accounts: Account[] = $state([]);
	let selectedTransaction: Transaction | null = $state(null);
	let isSidebarOpen = $state(false);

	function openSidebar(tx: Transaction) {
		selectedTransaction = tx;
		isSidebarOpen = true;
	}
	function closeSidebar() {
		isSidebarOpen = false;
	}
	// let accounts_count = $state(0);
	let hasBalances = $state(false);

	const fetchBankBalances = async () => {
		const { data, error } = await supabase
			.from('bank_accounts')
			.select('*')
			.eq('business_id', business_id);

		if (error) {
			console.error('Error fetching bank accounts:', error);
			accounts = [];
			return 0;
		}

		accounts = data ?? [];

		// console.log('Loaded from bank_accounts:', accounts);
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

	const saveTx = (tx: Transaction) => async (event: Event) => {
		event.preventDefault();
		console.log('Saving transaction:', tx);
	};

	onMount(async () => {
		fetchBankBalances();
	});
</script>

<div class={isSidebarOpen ? 'h-screen overflow-hidden' : ''}>
	<Navbar {session} {supabase} />

	<main class="p-4 lg:p-16">
		<h1 class="mb-8 mt-4 text-4xl">Welcome back {session.user.user_metadata.display_name}!</h1>
		<!-- <button onclick={fetchBankBalances} class="btn btn-primary">Fetch Balanaces</button> -->

		{#if accounts.length > 0}
			<h1 class="mb-4 text-2xl font-medium">Accounts ({accounts.length})</h1>

			<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
				{#each accounts as account}
					<div class="card bg-base-200 mb-4 p-8 text-center">
						<h2 class="mb-4 text-xs uppercase">{account.name}</h2>
						<p class=" mb-4 text-4xl">${account.current_balance}</p>

						<p class="mb-4 text-xs uppercase">Available: ${account.available_balance}</p>
					</div>
				{/each}
			</div>
		{/if}

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
						<tr
							onclick={() => openSidebar(transaction)}
							class="hover:bg-base-200 hover:cursor-pointer"
							data-id={transaction.id}
						>
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

		<!-- Sidebar -->
		<Sidebar bind:open={isSidebarOpen}>
			{#if selectedTransaction}
				<form class="flex flex-col overflow-y-auto p-8" onsubmit={saveTx(selectedTransaction)}>
					<h2 class="mb-4 text-xl font-semibold">Transaction Details</h2>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Merchant Name</legend>
						<input type="text" class="input w-full" value={selectedTransaction.name} disabled />
						<!-- <p class="label">You can edit page title later on from settings</p> -->
					</fieldset>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Amount</legend>
						<input
							type="number"
							class="input w-full"
							value={selectedTransaction.amount * -1}
							disabled
						/>
						<!-- <p class="label">You can edit page title later on from settings</p> -->
					</fieldset>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Posted On</legend>
						<input
							type="date"
							class="input w-full"
							value={selectedTransaction.date_posted}
							disabled
						/>
						<!-- <p class="label">You can edit page title later on from settings</p> -->
					</fieldset>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Transaction Type</legend>
						<select class="select w-full" value={selectedTransaction}>
							<option value="personal">Personal</option>
							<option value="business">Business</option>
							<option value="split">Split</option>
						</select>
						<!-- <p class="label">You can edit page title later on from settings</p> -->
					</fieldset>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Status</legend>
						<select class="select w-full" value={selectedTransaction.status} disabled>
							<option value="pending">Pending</option>
							<option value="posted">Posted</option>
							<option value="reviewed">Reviewed</option>
						</select>
						<!-- <p class="label">You can edit page title later on from settings</p> -->
					</fieldset>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Category</legend>
						<select class="input w-full" value={selectedTransaction.category_id} disabled>
							<!-- {#each businessCategories as category}
							<option value={category.id}>{category.name}</option>
						{/each} -->
						</select>
						<!-- <p class="label">You can edit page title later on from settings</p> -->
					</fieldset>
					<!-- <div class="flex-1"></div> -->
					<div class="collapse-arrow border-base-200 collapse mt-16 border">
						<input type="radio" />
						<div class="collapse-title font-semibold">Raw Details</div>
						<div class="collapse-content text-sm">
							<div class="h-full">
								{#each Object.entries(selectedTransaction) as [key, value]}
									<div class="mb-2">
										<span class="font-medium">{key}</span>:
										<span class="break-all">{JSON.stringify(value)}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
					<button type="submit" class="btn btn-primary mt-4"> Save Changes </button>
					<button type="button" class="btn btn-ghost mt-2" onclick={closeSidebar}> Cancel </button>
				</form>
			{/if}
		</Sidebar>
	</main>
</div>
