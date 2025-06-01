<!-- Sidebar.svelte -->
<script lang="ts">
	import { slide, fly } from 'svelte/transition';
	// children is the implicit snippet for everything passed between <Sidebar>…</Sidebar>

	let { open = $bindable(), children } = $props();
	function close() {
		open = false;
	}
	function closeOnEsc(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}
</script>

<svelte:window on:keydown={closeOnEsc} />
{#if open}
	<div class="fixed inset-0 z-40">
		<!-- Overlay: Use button for a11y compliance -->
		<button
			type="button"
			aria-label="Close sidebar"
			class="modal-backdrop bg-base-300/40 dark:bg-base-100/30 transition-discrete fixed inset-0 cursor-pointer backdrop-blur-md transition-all"
			onclick={close}
			tabindex="0"
		>
		</button>
		<!-- Sidebar content -->
		<div
			class="bg-base-100 dark:bg-base-300 sm:w-128 absolute bottom-0 right-0 top-0 overflow-y-auto shadow-lg"
			transition:fly={{ x: 300, duration: 250 }}
		>
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-xl"
				onclick={close}
			>
				×
			</button>
			<div class="flex min-h-full flex-col">
				{@render children?.()}
			</div>
			<div
				class="bg-base-300 pointer-events-none sticky bottom-0 flex h-40 [mask-image:linear-gradient(transparent,#000000)]"
			></div>
		</div>
	</div>
{/if}
