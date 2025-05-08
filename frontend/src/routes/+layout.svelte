<script lang="ts">
	import '../app.css';

	let { children, data } = $props();
	let { user } = $derived(data);
</script>

{@render children()}
