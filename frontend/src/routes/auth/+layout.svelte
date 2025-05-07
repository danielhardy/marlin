<script lang="ts">
	import Logo from '$lib/ui/Logo.svelte';
</script>

<div class="flex h-[100vh] flex-col items-center justify-center">
	<div
		class="mx-auto flex min-h-[100vh] w-full flex-col justify-center px-5 pt-0 md:h-[unset] md:max-w-[50%] lg:h-[100vh] lg:max-w-[50%] lg:px-6"
	>
		<div
			class="mx-auto my-auto mb-auto mt-8 flex w-[350px] max-w-[450px] flex-col md:mt-[70px] md:max-w-[450px] lg:mt-[130px] lg:max-w-[450px]"
		>
			<div class="mb-16 w-16 dark:text-white">
				<Logo />
			</div>

			<slot></slot>
		</div>
	</div>
</div>
