<script lang="ts">
	import { goto } from '$app/navigation';
	import { PUBLIC_BASE_URL } from '$env/static/public';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	let supabase = $derived(data.supabase);

	//Prep necessary state variables
	let email = $state('');
	let display_name = $state('');
	let password = $state('');
	let message = $state('');

	// Randomly generate a fake user placeholder
	function fun_user() {
		const users = [
			'Ada Lovelace', // Mathematician, first computer programmer
			'Grace Hopper', // Computer scientist, developed the first compiler
			'Alan Turing', // Mathematician, father of computer science
			'Peter Drucker', // Father of modern management
			'Tim Berners-Lee', // Inventor of the World Wide Web
			'Margaret Hamilton', // Led software development for Apollo missions
			'Steve Jobs', // Co-founder of Apple, leadership in innovation
			'Sheryl Sandberg', // COO of Facebook, leadership advocate
			'Vint Cerf', // Co-designer of TCP/IP protocols, 'Father of the Internet'
			'Katherine Johnson', // NASA mathematician, critical to spaceflight
			'Thomas Edison', // Inventor and businessman, innovator in leadership
			'John von Neumann', // Mathematician, influential in computing
			'Nelson Mandela', // Anti-apartheid leader, symbol of reconciliation
			'Marie Curie', // Pioneering scientist, leader in science and research
			'Linus Torvalds' // Creator of Linux and Git, key figure in computing
		];

		return users[Math.floor(Math.random() * users.length)];
	}

	const registerUser = async (e: Event) => {
		console.log('Trying to register user...');
		e.preventDefault();
		message = '';
		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: { data: { display_name } }
		});
		if (error) {
			console.log(error);
			message = error.message;
		} else {
			console.log('Registration successful!');
			//TODO Redirecto to future dashboard
			// message = 'Registration successful! Please check your email for confirmation.';
			goto('/onboarding/business');
		}
	};

	// Login with Google
	const signInWithGoogle = async () => {
		console.log('Sign in with Google!');

		message = '';
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${PUBLIC_BASE_URL}/auth/callback`
			}
		});
		if (error) {
			message = error.message;
		}
	};
</script>

<div class="steps mb-16 w-full">
	<ul class="steps text-sm">
		<li class="step step-primary">Account</li>
		<li class="step">Business</li>
		<li class="step">Bank</li>
	</ul>
</div>
<div class="page-header w-full">
	<h1 class="hdl hdl-1 mb-4 text-2xl font-medium">Create account</h1>
	<!-- Google Sign-In Button -->
	<!-- <button class="btn btn-outline my-4 w-full" onclick={() => signInWithGoogle()}>
		<span class="mr-2">
			<svg
				stroke="currentColor"
				fill="currentColor"
				stroke-width="0"
				version="1.1"
				x="0px"
				y="0px"
				viewBox="0 0 48 48"
				enable-background="new 0 0 48 48"
				class="h-5 w-5"
				height="1em"
				width="1em"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					fill="#FFC107"
					d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
				></path>
				<path
					fill="#FF3D00"
					d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
				></path>
				<path
					fill="#4CAF50"
					d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
				></path>
				<path
					fill="#1976D2"
					d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
				>
				</path>
			</svg>
		</span>
		<span> Sign in with Google </span>
	</button> -->

	<!-- Divider -->
	<!-- <div class="my-4 flex items-center">
		<hr class="flex-grow border-t" />
		<span class="mx-2 text-sm">or</span>
		<hr class="flex-grow border-t" />
	</div> -->

	<!-- Email/Password Registration Form -->
	{#if message}
		<div role="alert" class="alert">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="h-6 w-6 shrink-0 stroke-current"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
			<span class="text-sm">{message}</span>
		</div>
	{/if}
	<form onsubmit={registerUser} class="my-4 flex flex-col gap-4">
		<div class="form-control">
			<label class="label" for="full_name">
				<span class="label-text">Full Name</span>
			</label>
			<input
				type="text"
				placeholder={fun_user()}
				bind:value={display_name}
				class="input input-bordered w-full"
				required
				name="full_name"
			/>
		</div>
		<div class="form-control">
			<label class="label" for="email">
				<span class="label-text">Email</span>
			</label>
			<input
				type="email"
				placeholder="Enter your email"
				bind:value={email}
				class="input input-bordered w-full"
				required
				name="email"
			/>
		</div>
		<div class="form-control mb-4">
			<label class="label" for="password">
				<span class="label-text">Password</span>
			</label>
			<input
				type="password"
				placeholder="Enter your password"
				bind:value={password}
				class="input input-bordered w-full"
				required
				name="password"
			/>
		</div>
		<button type="submit" class="btn btn-neutral w-full">Register</button>
	</form>
	<p class="text-sm">Already a user? <a class="link" href="/auth/signin">Sign in</a></p>
</div>

<footer class="footer footer-center mt-16 p-4 text-xs text-neutral-500"></footer>
